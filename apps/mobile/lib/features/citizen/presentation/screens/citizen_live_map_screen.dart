import 'dart:async';
import 'dart:math' as math;

import 'package:clean_savar_core/clean_savar_core.dart' as core;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/savar_seed_data.dart';
import '../../../../core/models/hotspot_report.dart';
import '../../../../core/models/pickup_request.dart';
import '../../../../core/providers/citizen_state_provider.dart';
import '../../../../core/services/device_services.dart';
import '../../../../core/utils/bangla_formatters.dart';
import '../../../../core/utils/phone_caller.dart';
import '../../../../core/widgets/flat_card.dart';
import '../../../../core/widgets/status_badge.dart';
import '../widgets/report_garbage_sheet.dart';

enum MapFilterType { all, workers, pickups, garbage }

enum MapItemType { worker, pickup, garbage }

class MapMarkerData {
  const MapMarkerData({
    required this.id,
    required this.type,
    required this.titleBn,
    required this.subtitleBn,
    required this.lat,
    required this.lng,
    required this.statusLabelBn,
    required this.statusTone,
    this.phone,
    this.pickup,
    this.hotspot,
    this.vehicle,
  });

  final String id;
  final MapItemType type;
  final String titleBn;
  final String subtitleBn;
  final double lat;
  final double lng;
  final String statusLabelBn;
  final BadgeTone statusTone;
  final String? phone;
  final PickupRequest? pickup;
  final HotspotReport? hotspot;
  final core.CollectorVehicleItem? vehicle;
}

class CitizenLiveMapScreen extends ConsumerStatefulWidget {
  const CitizenLiveMapScreen({super.key});

  @override
  ConsumerState<CitizenLiveMapScreen> createState() =>
      _CitizenLiveMapScreenState();
}

class _CitizenLiveMapScreenState extends ConsumerState<CitizenLiveMapScreen> {
  MapFilterType _activeFilter = MapFilterType.all;
  MapMarkerData? _selectedMarker;
  List<core.CollectorVehicleItem> _vehicles = [];
  Timer? _liveRefreshTimer;

  // Zoom & Pan transformation controller
  final TransformationController _transformController =
      TransformationController();

  double? _myLat;
  double? _myLng;
  bool _isLocatingUser = false;

  @override
  void initState() {
    super.initState();
    _fetchLiveVehicles();
    _detectUserLocation(silent: true);
    _liveRefreshTimer = Timer.periodic(const Duration(seconds: 6), (_) {
      _fetchLiveVehicles();
      ref.read(citizenStateProvider.notifier).refreshFromServer();
    });
  }

  @override
  void dispose() {
    _liveRefreshTimer?.cancel();
    _transformController.dispose();
    super.dispose();
  }

  Future<void> _fetchLiveVehicles() async {
    if (!mounted) return;
    try {
      final client = ref.read(apiClientProvider);
      final list = await client.fetchVehicles();
      if (mounted) {
        setState(() {
          _vehicles = list;
        });
      }
    } catch (_) {
      // Fallback vehicles from known active seed
      if (mounted && _vehicles.isEmpty) {
        setState(() {
          _vehicles = const [
            core.CollectorVehicleItem(
              id: 'sv-van-01',
              code: 'SV-VAN-01',
              vehicleType: 'rickshaw_van',
              driverNameBn: 'মো. রফিকুল ইসলাম',
              driverPhone: '01712-448910',
              wardId: 3,
              currentLat: 23.8492,
              currentLng: 90.2546,
              status: 'en_route',
              capacityKg: 300,
            ),
            core.CollectorVehicleItem(
              id: 'sv-cmp-01',
              code: 'SV-CMP-01',
              vehicleType: 'compactor',
              driverNameBn: 'মো. কামাল হোসেন',
              driverPhone: '01819-653241',
              wardId: 5,
              currentLat: 23.8412,
              currentLng: 90.2535,
              status: 'active',
              capacityKg: 1500,
            ),
            core.CollectorVehicleItem(
              id: 'sv-van-04',
              code: 'SV-VAN-04',
              vehicleType: 'rickshaw_van',
              driverNameBn: 'আবদুল মান্নান',
              driverPhone: '01754-812309',
              wardId: 4,
              currentLat: 23.8458,
              currentLng: 90.2571,
              status: 'en_route',
              capacityKg: 300,
            ),
          ];
        });
      }
    }
  }

  Future<void> _detectUserLocation({bool silent = false}) async {
    if (_isLocatingUser) return;
    setState(() => _isLocatingUser = true);
    try {
      final fix =
          await ref.read(deviceLocationServiceProvider).getCurrentLocation();
      if (fix != null && mounted) {
        setState(() {
          _myLat = fix.lat;
          _myLng = fix.lng;
        });
        if (!silent) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('আপনার বর্তমান অবস্থান ম্যাপে প্রদর্শিত হচ্ছে।'),
              duration: Duration(seconds: 2),
            ),
          );
        }
      }
    } finally {
      if (mounted) setState(() => _isLocatingUser = false);
    }
  }

  void _resetMapZoom() {
    _transformController.value = Matrix4.identity();
  }

  List<MapMarkerData> _buildMarkers({
    required List<PickupRequest> pickups,
    required List<HotspotReport> hotspots,
  }) {
    final list = <MapMarkerData>[];

    // 1. Worker Vehicles
    if (_activeFilter == MapFilterType.all ||
        _activeFilter == MapFilterType.workers) {
      for (final v in _vehicles) {
        final wardInfo = SavarSeedData.wards.where((w) => w.id == v.wardId);
        final wardLabel = wardInfo.isNotEmpty
            ? wardInfo.first.areaChipLabel
            : 'ওয়ার্ড ${BanglaFormatters.formatInt(v.wardId)}';

        list.add(
          MapMarkerData(
            id: 'worker_${v.id}',
            type: MapItemType.worker,
            titleBn: '${v.code} • ${v.driverNameBn}',
            subtitleBn: 'দায়িত্বপ্রাপ্ত জোন: $wardLabel',
            lat: v.currentLat,
            lng: v.currentLng,
            statusLabelBn: v.status == 'en_route'
                ? 'অন-রুট চলছে'
                : (v.status == 'active' ? 'সংগ্রহ চলছে' : 'উপলব্ধ'),
            statusTone: BadgeTone.green,
            phone: v.driverPhone,
            vehicle: v,
          ),
        );
      }
    }

    // 2. Pickups
    if (_activeFilter == MapFilterType.all ||
        _activeFilter == MapFilterType.pickups) {
      for (final p in pickups) {
        final ward = SavarSeedData.wards.where((w) => w.id == p.wardId);
        final lat = ward.isNotEmpty ? ward.first.lat : 23.8412;
        final lng = ward.isNotEmpty ? ward.first.lng : 90.2535;

        final tone = switch (p.status) {
          PickupStatus.pending => BadgeTone.amber,
          PickupStatus.assigned || PickupStatus.inProgress => BadgeTone.blue,
          PickupStatus.collected => BadgeTone.green,
        };

        list.add(
          MapMarkerData(
            id: 'pickup_${p.id}',
            type: MapItemType.pickup,
            titleBn: '${p.trackingCode} • ${p.category.labelBn}',
            subtitleBn: p.addressLine,
            lat: lat,
            lng: lng,
            statusLabelBn: p.status.labelBn,
            statusTone: tone,
            pickup: p,
          ),
        );
      }
    }

    // 3. Garbage Hotspots
    if (_activeFilter == MapFilterType.all ||
        _activeFilter == MapFilterType.garbage) {
      for (final h in hotspots) {
        final tone = switch (h.status) {
          HotspotStatus.reported => BadgeTone.red,
          HotspotStatus.verified || HotspotStatus.dispatched => BadgeTone.amber,
          HotspotStatus.cleared => BadgeTone.green,
        };

        list.add(
          MapMarkerData(
            id: 'garbage_${h.id}',
            type: MapItemType.garbage,
            titleBn: '${h.trackingCode} • ${h.primaryTitleBn}',
            subtitleBn: h.landmark,
            lat: h.lat,
            lng: h.lng,
            statusLabelBn: h.status.labelBn,
            statusTone: tone,
            hotspot: h,
          ),
        );
      }
    }

    return list;
  }

  @override
  Widget build(BuildContext context) {
    final citizen = ref.watch(citizenStateProvider);
    final allMarkers = _buildMarkers(
      pickups: citizen.pickups,
      hotspots: citizen.hotspots,
    );

    // Compute bounding coordinate bounds for mapping coordinates to canvas coordinates
    var minLat = 23.77;
    var maxLat = 23.95;
    var minLng = 90.22;
    var maxLng = 90.35;

    for (final m in allMarkers) {
      minLat = math.min(minLat, m.lat - 0.01);
      maxLat = math.max(maxLat, m.lat + 0.01);
      minLng = math.min(minLng, m.lng - 0.01);
      maxLng = math.max(maxLng, m.lng + 0.01);
    }
    final latSpan = math.max(0.01, maxLat - minLat);
    final lngSpan = math.max(0.01, maxLng - minLng);

    return Scaffold(
      backgroundColor: const Color(0xFFE2E8F0),
      body: Stack(
        children: [
          // 1. Full-screen Interactive Zoomable Canvas Map
          Positioned.fill(
            child: InteractiveViewer(
              transformationController: _transformController,
              boundaryMargin: const EdgeInsets.all(300),
              minScale: 0.6,
              maxScale: 3.5,
              child: LayoutBuilder(
                builder: (context, constraints) {
                  final mapWidth = math.max(600.0, constraints.maxWidth * 1.5);
                  final mapHeight =
                      math.max(700.0, constraints.maxHeight * 1.5);

                  return SizedBox(
                    width: mapWidth,
                    height: mapHeight,
                    child: Stack(
                      children: [
                        // Map base road grid painter
                        Positioned.fill(
                          child: CustomPaint(
                            painter: _LiveSavarTopographyPainter(),
                          ),
                        ),

                        // Savar Ward Labels in background
                        for (final ward in SavarSeedData.wards)
                          Positioned(
                            left: ((ward.lng - minLng) / lngSpan)
                                    .clamp(0.05, 0.92) *
                                (mapWidth - 100),
                            top: (1.0 -
                                    ((ward.lat - minLat) / latSpan)
                                        .clamp(0.05, 0.92)) *
                                (mapHeight - 60),
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: Colors.white.withOpacity(0.65),
                                borderRadius: BorderRadius.circular(6),
                                border: Border.all(
                                    color: const Color(0xFFCBD5E1), width: 0.8),
                              ),
                              child: Text(
                                ward.code,
                                style: const TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w700,
                                  color: Color(0xFF64748B),
                                ),
                              ),
                            ),
                          ),

                        // User GPS Location marker
                        if (_myLat != null && _myLng != null)
                          Positioned(
                            left: ((_myLng! - minLng) / lngSpan)
                                    .clamp(0.05, 0.95) *
                                (mapWidth - 40),
                            top: (1.0 -
                                    ((_myLat! - minLat) / latSpan)
                                        .clamp(0.05, 0.95)) *
                                (mapHeight - 40),
                            child: const _UserLiveLocationMarker(),
                          ),

                        // Active Live Markers (Workers, Pickups, Garbage)
                        for (final marker in allMarkers)
                          Positioned(
                            left: ((marker.lng - minLng) / lngSpan)
                                    .clamp(0.04, 0.94) *
                                (mapWidth - 70),
                            top: (1.0 -
                                    ((marker.lat - minLat) / latSpan)
                                        .clamp(0.05, 0.94)) *
                                (mapHeight - 60),
                            child: _MapPinWidget(
                              data: marker,
                              isSelected: _selectedMarker?.id == marker.id,
                              onTap: () {
                                setState(() => _selectedMarker = marker);
                              },
                            ),
                          ),
                      ],
                    ),
                  );
                },
              ),
            ),
          ),

          // 2. Top Header & Filter Bar
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: Container(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(bottom: Radius.circular(16)),
                boxShadow: [
                  BoxShadow(
                    color: Color(0x140F172A),
                    blurRadius: 10,
                    offset: Offset(0, 3),
                  ),
                ],
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(6),
                        decoration: BoxDecoration(
                          color: AppColors.primaryGreenTint,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Icon(
                          Icons.radar_rounded,
                          color: AppColors.primaryGreen,
                          size: 20,
                        ),
                      ),
                      const SizedBox(width: 8),
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'সাভার লাইভ বর্জ্য ও কর্মী ম্যাপ',
                              style: TextStyle(
                                fontSize: 16.5,
                                fontWeight: FontWeight.w800,
                                color: AppColors.textPrimary,
                              ),
                            ),
                            Text(
                              'পিকআপ পয়েন্ট • চলমান পরিচ্ছন্নতাকর্মী • ময়লা রিপোর্ট',
                              style: TextStyle(
                                fontSize: 11.5,
                                color: AppColors.textSecondary,
                              ),
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        onPressed: () {
                          _fetchLiveVehicles();
                          ref
                              .read(citizenStateProvider.notifier)
                              .refreshFromServer();
                        },
                        icon: const Icon(Icons.sync_rounded),
                        tooltip: 'লাইভ তথ্য রিফ্রেশ',
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: [
                        _FilterButton(
                          label:
                              'সব (${BanglaFormatters.formatInt(allMarkers.length)})',
                          icon: Icons.all_inclusive_rounded,
                          selected: _activeFilter == MapFilterType.all,
                          onTap: () => setState(
                              () => _activeFilter = MapFilterType.all),
                        ),
                        const SizedBox(width: 6),
                        _FilterButton(
                          label:
                              'কর্মী (${BanglaFormatters.formatInt(_vehicles.length)})',
                          icon: Icons.local_shipping_rounded,
                          selected: _activeFilter == MapFilterType.workers,
                          onTap: () => setState(
                              () => _activeFilter = MapFilterType.workers),
                        ),
                        const SizedBox(width: 6),
                        _FilterButton(
                          label:
                              'পিকআপ (${BanglaFormatters.formatInt(citizen.pickups.length)})',
                          icon: Icons.home_work_rounded,
                          selected: _activeFilter == MapFilterType.pickups,
                          onTap: () => setState(
                              () => _activeFilter = MapFilterType.pickups),
                        ),
                        const SizedBox(width: 6),
                        _FilterButton(
                          label:
                              'ময়লা (${BanglaFormatters.formatInt(citizen.hotspots.length)})',
                          icon: Icons.delete_outline_rounded,
                          selected: _activeFilter == MapFilterType.garbage,
                          onTap: () => setState(
                              () => _activeFilter = MapFilterType.garbage),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),

          // 3. Right Map Control Tools (GPS Center, Zoom Reset)
          Positioned(
            right: 16,
            bottom: _selectedMarker != null ? 220 : 86,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                FloatingActionButton.small(
                  heroTag: 'map_reset_btn',
                  backgroundColor: Colors.white,
                  foregroundColor: AppColors.textPrimary,
                  onPressed: _resetMapZoom,
                  tooltip: 'ম্যাপ রিসেট',
                  child: const Icon(Icons.crop_free_rounded, size: 20),
                ),
                const SizedBox(height: 10),
                FloatingActionButton.small(
                  heroTag: 'map_gps_btn',
                  backgroundColor: Colors.white,
                  foregroundColor: AppColors.primaryGreen,
                  onPressed: () => _detectUserLocation(silent: false),
                  tooltip: 'আমার অবস্থান',
                  child: _isLocatingUser
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.my_location_rounded, size: 20),
                ),
              ],
            ),
          ),

          // 4. Floating Action Button: Report Garbage
          Positioned(
            left: 16,
            bottom: _selectedMarker != null ? 220 : 20,
            child: FloatingActionButton.extended(
              heroTag: 'map_report_btn',
              backgroundColor: AppColors.dangerRed,
              foregroundColor: Colors.white,
              onPressed: () => showReportGarbageSheet(context),
              icon: const Icon(Icons.add_a_photo_rounded, size: 18),
              label: const Text(
                'ময়লা রিপোর্ট করুন',
                style: TextStyle(fontWeight: FontWeight.w700),
              ),
            ),
          ),

          // 5. Selected Marker Details Floating Card
          if (_selectedMarker != null)
            Positioned(
              left: 14,
              right: 14,
              bottom: 14,
              child: _MarkerDetailCard(
                data: _selectedMarker!,
                onClose: () => setState(() => _selectedMarker = null),
              ),
            ),
        ],
      ),
    );
  }
}

class _FilterButton extends StatelessWidget {
  const _FilterButton({
    required this.label,
    required this.icon,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final IconData icon;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: selected ? AppColors.primaryGreen : const Color(0xFFF1F5F9),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: selected ? AppColors.primaryGreenDark : const Color(0xFFCBD5E1),
            width: 1,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 15,
              color: selected ? Colors.white : AppColors.textPrimary,
            ),
            const SizedBox(width: 5),
            Text(
              label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: selected ? Colors.white : AppColors.textPrimary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _MapPinWidget extends StatelessWidget {
  const _MapPinWidget({
    required this.data,
    required this.isSelected,
    required this.onTap,
  });

  final MapMarkerData data;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final (icon, bgColor, label) = switch (data.type) {
      MapItemType.worker => (
          Icons.local_shipping_rounded,
          const Color(0xFF059669),
          data.vehicle?.code ?? 'কর্মী',
        ),
      MapItemType.pickup => (
          Icons.home_work_rounded,
          const Color(0xFF2563EB),
          'পিকআপ',
        ),
      MapItemType.garbage => (
          Icons.delete_forever_rounded,
          const Color(0xFFDC2626),
          'ময়লা',
        ),
    };

    return GestureDetector(
      onTap: onTap,
      child: AnimatedScale(
        scale: isSelected ? 1.15 : 1.0,
        duration: const Duration(milliseconds: 160),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3.5),
              decoration: BoxDecoration(
                color: isSelected ? Colors.black : bgColor,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.white, width: 2),
                boxShadow: const [
                  BoxShadow(
                    color: Color(0x33000000),
                    blurRadius: 6,
                    offset: Offset(0, 3),
                  ),
                ],
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(icon, size: 13, color: Colors.white),
                  const SizedBox(width: 4),
                  Text(
                    label,
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      color: Colors.white,
                    ),
                  ),
                ],
              ),
            ),
            CustomPaint(
              size: const Size(8, 5),
              painter: _TrianglePointerPainter(
                color: isSelected ? Colors.black : bgColor,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _TrianglePointerPainter extends CustomPainter {
  _TrianglePointerPainter({required this.color});
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = color;
    final path = Path()
      ..moveTo(0, 0)
      ..lineTo(size.width / 2, size.height)
      ..lineTo(size.width, 0)
      ..close();
    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class _UserLiveLocationMarker extends StatelessWidget {
  const _UserLiveLocationMarker();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 24,
      height: 24,
      decoration: BoxDecoration(
        color: const Color(0xFF3B82F6),
        shape: BoxShape.circle,
        border: Border.all(color: Colors.white, width: 2.5),
        boxShadow: const [
          BoxShadow(
            color: Color(0x403B82F6),
            blurRadius: 10,
            spreadRadius: 4,
          ),
        ],
      ),
      child: const Center(
        child: Icon(Icons.person_rounded, size: 13, color: Colors.white),
      ),
    );
  }
}

class _MarkerDetailCard extends StatelessWidget {
  const _MarkerDetailCard({
    required this.data,
    required this.onClose,
  });

  final MapMarkerData data;
  final VoidCallback onClose;

  @override
  Widget build(BuildContext context) {
    return FlatCard(
      padding: const EdgeInsets.all(14),
      hasShadow: true,
      borderColor: switch (data.type) {
        MapItemType.worker => AppColors.primaryGreen,
        MapItemType.pickup => AppColors.infoBlue,
        MapItemType.garbage => AppColors.dangerRed,
      },
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: switch (data.type) {
                    MapItemType.worker => AppColors.primaryGreenTint,
                    MapItemType.pickup => AppColors.infoBlueTint,
                    MapItemType.garbage => AppColors.dangerRedTint,
                  },
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(
                  switch (data.type) {
                    MapItemType.worker => Icons.local_shipping_rounded,
                    MapItemType.pickup => Icons.home_work_rounded,
                    MapItemType.garbage => Icons.delete_forever_rounded,
                  },
                  color: switch (data.type) {
                    MapItemType.worker => AppColors.primaryGreenDark,
                    MapItemType.pickup => AppColors.infoBlueDark,
                    MapItemType.garbage => AppColors.dangerRed,
                  },
                  size: 22,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      data.titleBn,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w800,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      data.subtitleBn,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 12.5,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
              IconButton(
                onPressed: onClose,
                icon: const Icon(Icons.close_rounded, size: 20),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              StatusBadge(
                label: data.statusLabelBn,
                tone: data.statusTone,
              ),
              const Spacer(),
              if (data.phone != null && data.phone!.isNotEmpty)
                OutlinedButton.icon(
                  onPressed: () => PhoneCaller.call(
                    context,
                    phoneNumber: data.phone!,
                    contactName: data.titleBn,
                  ),
                  icon: const Icon(Icons.call, size: 16),
                  label: const Text('কল করুন'),
                  style: OutlinedButton.styleFrom(
                    visualDensity: VisualDensity.compact,
                    foregroundColor: AppColors.primaryGreenDark,
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

class _LiveSavarTopographyPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    // Background terrain fill
    final bgPaint = Paint()..color = const Color(0xFFF8FAFC);
    canvas.drawRect(Offset.zero & size, bgPaint);

    // Subtle map grid
    final gridPaint = Paint()
      ..color = const Color(0xFFE2E8F0)
      ..strokeWidth = 0.8;
    for (var x = 0.0; x < size.width; x += 40) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), gridPaint);
    }
    for (var y = 0.0; y < size.height; y += 40) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), gridPaint);
    }

    // Bangshi River curve through west Savar
    final riverPaint = Paint()
      ..color = const Color(0xFFBAE6FD).withOpacity(0.6)
      ..strokeWidth = 14
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;
    final riverPath = Path()
      ..moveTo(size.width * 0.05, 0)
      ..quadraticBezierTo(
        size.width * 0.18,
        size.height * 0.45,
        size.width * 0.08,
        size.height,
      );
    canvas.drawPath(riverPath, riverPaint);

    // Dhaka-Aricha National Highway (N5) schematic corridor
    final highwayCasing = Paint()
      ..color = const Color(0xFF94A3B8)
      ..strokeWidth = 9
      ..strokeCap = StrokeCap.round;
    final highwayCore = Paint()
      ..color = const Color(0xFFF59E0B)
      ..strokeWidth = 5
      ..strokeCap = StrokeCap.round;

    final p1 = Offset(size.width * 0.12, size.height * 0.95);
    final p2 = Offset(size.width * 0.88, size.height * 0.08);

    canvas.drawLine(p1, p2, highwayCasing);
    canvas.drawLine(p1, p2, highwayCore);

    // Thana Road / Bazar Road cross-artery
    final localRoad = Paint()
      ..color = const Color(0xFFCBD5E1)
      ..strokeWidth = 4;
    canvas.drawLine(
      Offset(size.width * 0.08, size.height * 0.52),
      Offset(size.width * 0.75, size.height * 0.58),
      localRoad,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
