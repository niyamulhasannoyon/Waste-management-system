import 'dart:math' as math;

// ignore: deprecated_member_use
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/constants/app_colors.dart';
import '../../../../core/models/hotspot_report.dart';
import '../../../../core/providers/citizen_state_provider.dart';
import '../../../../core/services/device_services.dart';
import '../../../../core/utils/bangla_formatters.dart';
import '../../../../core/widgets/flat_card.dart';
import '../../../../core/widgets/status_badge.dart';
import '../widgets/report_garbage_sheet.dart';

String? _resolveSafePhotoUrl(String rawUrl, String apiBaseUrl) {
  final trimmed = rawUrl.trim();
  if (trimmed.isEmpty) return null;
  if (trimmed.toLowerCase().endsWith('.svg')) return null;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  if (trimmed.startsWith('/')) {
    final apiUri = Uri.tryParse(apiBaseUrl);
    if (apiUri == null || !apiUri.hasScheme || apiUri.host.isEmpty) {
      return null;
    }
    final origin = apiUri.hasPort
        ? '${apiUri.scheme}://${apiUri.host}:${apiUri.port}'
        : '${apiUri.scheme}://${apiUri.host}';
    return '$origin$trimmed';
  }
  return null;
}

enum _HotspotFilter { all, active, cleared }

class CitizenHotspotsScreen extends ConsumerStatefulWidget {
  const CitizenHotspotsScreen({super.key});

  @override
  ConsumerState<CitizenHotspotsScreen> createState() =>
      _CitizenHotspotsScreenState();
}

class _CitizenHotspotsScreenState extends ConsumerState<CitizenHotspotsScreen> {
  _HotspotFilter _filter = _HotspotFilter.all;
  String? _selectedHotspotId;

  @override
  Widget build(BuildContext context) {
    final hotspots = ref.watch(
      citizenStateProvider.select((state) => state.hotspots),
    );
    final apiBaseUrl = ref.watch(apiClientProvider).baseUrl;

    final filtered = hotspots.where((h) {
      return switch (_filter) {
        _HotspotFilter.all => true,
        _HotspotFilter.active => h.status != HotspotStatus.cleared,
        _HotspotFilter.cleared => h.status == HotspotStatus.cleared,
      };
    }).toList(growable: false);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 14, 16, 10),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Expanded(
                    child: Text(
                      'সাভার হটস্পট ম্যাপ',
                      style: TextStyle(
                        fontSize: 21,
                        fontWeight: FontWeight.w800,
                        letterSpacing: -0.2,
                        color: AppColors.textPrimary,
                      ),
                    ),
                  ),
                  FilledButton.icon(
                    onPressed: () => showReportGarbageSheet(context),
                    style: FilledButton.styleFrom(
                      backgroundColor: AppColors.primaryGreen,
                      foregroundColor: Colors.white,
                      elevation: 0,
                      minimumSize: const Size(44, 40),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 14,
                        vertical: 8,
                      ),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                    icon: const Icon(Icons.add_a_photo_rounded, size: 17),
                    label: const Text(
                      'রিপোর্ট দিন',
                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              _SavarSpatialGridMap(
                hotspots: filtered,
                selectedId: _selectedHotspotId,
                onSelectHotspot: (id) =>
                    setState(() => _selectedHotspotId = id),
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  _HotspotFilterChip(
                    label:
                        'সব (${BanglaFormatters.formatInt(hotspots.length)})',
                    selected: _filter == _HotspotFilter.all,
                    onTap: () => setState(() => _filter = _HotspotFilter.all),
                  ),
                  const SizedBox(width: 8),
                  _HotspotFilterChip(
                    label: 'সক্রিয়',
                    selected: _filter == _HotspotFilter.active,
                    onTap: () =>
                        setState(() => _filter = _HotspotFilter.active),
                  ),
                  const SizedBox(width: 8),
                  _HotspotFilterChip(
                    label: 'পরিষ্কার হয়েছে',
                    selected: _filter == _HotspotFilter.cleared,
                    onTap: () =>
                        setState(() => _filter = _HotspotFilter.cleared),
                  ),
                ],
              ),
            ],
          ),
        ),
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.fromLTRB(16, 2, 16, 24),
            itemCount: filtered.length,
            itemBuilder: (context, index) {
              final hotspot = filtered[index];
              final isSelected = hotspot.id == _selectedHotspotId;
              final safePhotos = hotspot.photoUrls
                  .map((url) => _resolveSafePhotoUrl(url, apiBaseUrl))
                  .whereType<String>()
                  .toList(growable: false);
              final tone = switch (hotspot.status) {
                HotspotStatus.reported => BadgeTone.amber,
                HotspotStatus.verified ||
                HotspotStatus.dispatched =>
                  BadgeTone.blue,
                HotspotStatus.cleared => BadgeTone.green,
              };

              return Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: FlatCard(
                  onTap: () => setState(() => _selectedHotspotId = hotspot.id),
                  borderColor: isSelected
                      ? AppColors.primaryGreen
                      : AppColors.border,
                  borderWidth: isSelected ? 1.5 : 1,
                  color: isSelected
                      ? AppColors.primaryGreenTint
                      : AppColors.cardSurface,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              hotspot.landmark,
                              style: const TextStyle(
                                fontSize: 15.5,
                                fontWeight: FontWeight.w700,
                                color: AppColors.textPrimary,
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          StatusBadge(
                            label: hotspot.status.labelBn,
                            tone: tone,
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '${hotspot.wardLabel} • ${hotspot.primaryTitleBn}',
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: AppColors.textSecondary,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Row(
                        children: [
                          const Icon(
                            Icons.my_location_rounded,
                            size: 14,
                            color: AppColors.primaryGreen,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            BanglaFormatters.formatCoordinates(
                              hotspot.lat,
                              hotspot.lng,
                            ),
                            style: const TextStyle(
                              fontSize: 12,
                              color: AppColors.textMuted,
                            ),
                          ),
                          const Spacer(),
                          Text(
                            hotspot.reportedAtLabel,
                            style: const TextStyle(
                              fontSize: 12,
                              color: AppColors.textMuted,
                            ),
                          ),
                        ],
                      ),
                      if (safePhotos.isNotEmpty) ...[
                        const SizedBox(height: 8),
                        ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: Image.network(
                            safePhotos.first,
                            height: 112,
                            width: double.infinity,
                            fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) => const SizedBox.shrink(),
                          ),
                        ),
                      ] else if (hotspot.hasPhoto) ...[
                        const SizedBox(height: 8),
                        const Row(
                          children: [
                            Icon(
                              Icons.photo_camera_outlined,
                              size: 14,
                              color: AppColors.primaryGreen,
                            ),
                            SizedBox(width: 4),
                            Text(
                              'ছবি সংযুক্ত রয়েছে',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: AppColors.primaryGreenDark,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}

class _SavarSpatialGridMap extends StatelessWidget {
  const _SavarSpatialGridMap({
    required this.hotspots,
    required this.selectedId,
    required this.onSelectHotspot,
  });

  final List<HotspotReport> hotspots;
  final String? selectedId;
  final ValueChanged<String> onSelectHotspot;

  @override
  Widget build(BuildContext context) {
    // Bounding box spans all Savar Pouroshava wards plus surrounding unions.
    var minLat = 23.775;
    var maxLat = 23.935;
    var minLng = 90.228;
    var maxLng = 90.335;
    for (final hotspot in hotspots) {
      minLat = math.min(minLat, hotspot.lat - 0.008);
      maxLat = math.max(maxLat, hotspot.lat + 0.008);
      minLng = math.min(minLng, hotspot.lng - 0.008);
      maxLng = math.max(maxLng, hotspot.lng + 0.008);
    }
    final latSpan = math.max(0.01, maxLat - minLat);
    final lngSpan = math.max(0.01, maxLng - minLng);

    return FlatCard(
      padding: EdgeInsets.zero,
      color: AppColors.cardSurface,
      child: SizedBox(
        height: 184,
        child: ClipRRect(
          borderRadius: BorderRadius.circular(11),
          child: LayoutBuilder(
            builder: (context, constraints) {
              return Stack(
                children: [
                  Positioned.fill(
                    child: CustomPaint(
                      painter: _SavarRoadGridPainter(),
                    ),
                  ),
                  const Positioned(
                    left: 10,
                    top: 10,
                    child: StatusBadge(
                      label: 'সাভার পৌরসভা ও ইউনিয়ন • লাইভ জোন',
                      tone: BadgeTone.green,
                      icon: Icons.public_rounded,
                    ),
                  ),
                  for (final hotspot in hotspots)
                    Positioned(
                      left: ((hotspot.lng - minLng) / lngSpan)
                              .clamp(0.04, 0.96) *
                          math.max<double>(0.0, constraints.maxWidth - 48),
                      top: (1.0 -
                              ((hotspot.lat - minLat) / latSpan)
                                  .clamp(0.08, 0.90)) *
                          math.max<double>(0.0, constraints.maxHeight - 48),
                      child: Semantics(
                        button: true,
                        label: '${hotspot.wardLabel}: ${hotspot.landmark}',
                        child: Material(
                          color: Colors.transparent,
                          child: InkWell(
                            onTap: () => onSelectHotspot(hotspot.id),
                            borderRadius: BorderRadius.circular(24),
                            child: ConstrainedBox(
                              constraints: const BoxConstraints(
                                minWidth: 48,
                                minHeight: 48,
                              ),
                              child: Center(
                                child: _MapPin(
                                  hotspot: hotspot,
                                  isSelected: hotspot.id == selectedId,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                ],
              );
            },
          ),
        ),
      ),
    );
  }
}

class _MapPin extends StatelessWidget {
  const _MapPin({
    required this.hotspot,
    required this.isSelected,
  });

  final HotspotReport hotspot;
  final bool isSelected;

  @override
  Widget build(BuildContext context) {
    final pinColor = switch (hotspot.status) {
      HotspotStatus.cleared => AppColors.primaryGreen,
      HotspotStatus.dispatched || HotspotStatus.verified => AppColors.infoBlue,
      HotspotStatus.reported => AppColors.dangerRed,
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 4),
      decoration: BoxDecoration(
        color: isSelected ? AppColors.textPrimary : pinColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white, width: 1.5),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.location_on, size: 14, color: Colors.white),
          const SizedBox(width: 2),
          Text(
            'W${hotspot.wardId}',
            style: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              color: Colors.white,
            ),
          ),
        ],
      ),
    );
  }
}

class _SavarRoadGridPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final bgPaint = Paint()..color = const Color(0xFFF1F5F9);
    canvas.drawRect(Offset.zero & size, bgPaint);

    final gridPaint = Paint()
      ..color = const Color(0xFFE2E8F0)
      ..strokeWidth = 1;

    for (var x = 24.0; x < size.width; x += 36) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), gridPaint);
    }
    for (var y = 24.0; y < size.height; y += 36) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), gridPaint);
    }

    // Dhaka-Aricha Highway schematic corridor through Savar
    final highwayPaint = Paint()
      ..color = const Color(0xFFCBD5E1)
      ..strokeWidth = 5
      ..strokeCap = StrokeCap.round;
    canvas.drawLine(
      Offset(size.width * 0.16, size.height * 0.92),
      Offset(size.width * 0.86, size.height * 0.12),
      highwayPaint,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class _HotspotFilterChip extends StatelessWidget {
  const _HotspotFilterChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return ChoiceChip(
      label: Text(label),
      selected: selected,
      showCheckmark: false,
      selectedColor: AppColors.primaryGreenTint,
      backgroundColor: AppColors.cardSurface,
      elevation: 0,
      pressElevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
        side: BorderSide(
          color: selected ? AppColors.primaryGreen : AppColors.borderStrong,
          width: selected ? 1.4 : 1,
        ),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
      labelStyle: TextStyle(
        fontSize: 13,
        fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
        color: selected ? AppColors.primaryGreenDark : AppColors.textSecondary,
      ),
      onSelected: (_) => onTap(),
    );
  }
}
