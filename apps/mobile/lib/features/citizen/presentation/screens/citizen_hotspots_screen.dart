import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/constants/app_colors.dart';
import '../../../../core/models/hotspot_report.dart';
import '../../../../core/providers/citizen_state_provider.dart';
import '../../../../core/utils/bangla_formatters.dart';
import '../../../../core/widgets/flat_card.dart';
import '../../../../core/widgets/status_badge.dart';
import '../widgets/report_garbage_sheet.dart';

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
                        fontSize: 20,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                      ),
                    ),
                  ),
                  FilledButton.icon(
                    onPressed: () => showReportGarbageSheet(context),
                    style: FilledButton.styleFrom(
                      minimumSize: const Size(44, 42),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 8,
                      ),
                    ),
                    icon: const Icon(Icons.add_a_photo_outlined, size: 17),
                    label: const Text('রিপোর্ট দিন'),
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
    // Savar bounding box used to project lat/lng onto lightweight CustomPaint canvas.
    const minLat = 23.840;
    const maxLat = 23.875;
    const minLng = 90.245;
    const maxLng = 90.278;

    return FlatCard(
      padding: EdgeInsets.zero,
      color: AppColors.cardSurface,
      child: SizedBox(
        height: 170,
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
                      label: 'সাভার পৌরসভা • লাইভ জোন',
                      tone: BadgeTone.green,
                      icon: Icons.public_rounded,
                    ),
                  ),
                  for (final hotspot in hotspots)
                    Positioned(
                      left: ((hotspot.lng - minLng) / (maxLng - minLng))
                              .clamp(0.08, 0.88) *
                          (constraints.maxWidth - 40),
                      top: (1.0 -
                              ((hotspot.lat - minLat) / (maxLat - minLat))
                                  .clamp(0.18, 0.82)) *
                          (constraints.maxHeight - 44),
                      child: GestureDetector(
                        onTap: () => onSelectHotspot(hotspot.id),
                        child: _MapPin(
                          hotspot: hotspot,
                          isSelected: hotspot.id == selectedId,
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
      selectedColor: AppColors.primaryGreenTint,
      backgroundColor: AppColors.cardSurface,
      side: BorderSide(
        color: selected ? AppColors.primaryGreen : AppColors.borderStrong,
      ),
      labelStyle: TextStyle(
        fontSize: 13,
        fontWeight: selected ? FontWeight.w700 : FontWeight.w600,
        color: selected ? AppColors.primaryGreenDark : AppColors.textSecondary,
      ),
      onSelected: (_) => onTap(),
    );
  }
}
