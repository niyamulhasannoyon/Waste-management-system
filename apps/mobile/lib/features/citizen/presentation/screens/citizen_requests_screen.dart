// ignore: deprecated_member_use
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/constants/app_colors.dart';
import '../../../../core/models/hotspot_report.dart';
import '../../../../core/models/pickup_request.dart';
import '../../../../core/providers/citizen_state_provider.dart';
import '../../../../core/utils/bangla_formatters.dart';
import '../../../../core/widgets/flat_card.dart';
import '../../../../core/widgets/status_badge.dart';
import '../widgets/report_garbage_sheet.dart';
import '../widgets/request_pickup_sheet.dart';

enum _RequestFilter { all, pickups, reports }

class CitizenRequestsScreen extends ConsumerStatefulWidget {
  const CitizenRequestsScreen({super.key});

  @override
  ConsumerState<CitizenRequestsScreen> createState() =>
      _CitizenRequestsScreenState();
}

class _CitizenRequestsScreenState extends ConsumerState<CitizenRequestsScreen> {
  _RequestFilter _filter = _RequestFilter.all;

  @override
  Widget build(BuildContext context) {
    final citizen = ref.watch(citizenStateProvider);

    final items = <_ActivityEntry>[
      if (_filter != _RequestFilter.reports)
        for (final pickup in citizen.pickups) _ActivityEntry.pickup(pickup),
      if (_filter != _RequestFilter.pickups)
        for (final report in citizen.hotspots) _ActivityEntry.report(report),
    ];

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
                      'আমার রিকোয়েস্ট ও রিপোর্ট',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                      ),
                    ),
                  ),
                  FilledButton.tonalIcon(
                    onPressed: () => showRequestPickupSheet(context),
                    style: FilledButton.styleFrom(
                      backgroundColor: AppColors.primaryGreenTint,
                      foregroundColor: AppColors.primaryGreenDark,
                      minimumSize: const Size(44, 40),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 8,
                      ),
                    ),
                    icon: const Icon(Icons.add_rounded, size: 18),
                    label: const Text('নতুন পিকআপ'),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    _FilterPill(
                      label:
                          'সব (${BanglaFormatters.formatInt(citizen.pickups.length + citizen.hotspots.length)})',
                      selected: _filter == _RequestFilter.all,
                      onTap: () => setState(() => _filter = _RequestFilter.all),
                    ),
                    const SizedBox(width: 8),
                    _FilterPill(
                      label:
                          'বাসার পিকআপ (${BanglaFormatters.formatInt(citizen.pickups.length)})',
                      selected: _filter == _RequestFilter.pickups,
                      onTap: () =>
                          setState(() => _filter = _RequestFilter.pickups),
                    ),
                    const SizedBox(width: 8),
                    _FilterPill(
                      label:
                          'ময়লা রিপোর্ট (${BanglaFormatters.formatInt(citizen.hotspots.length)})',
                      selected: _filter == _RequestFilter.reports,
                      onTap: () =>
                          setState(() => _filter = _RequestFilter.reports),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        Expanded(
          child: items.isEmpty
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(
                          Icons.inbox_outlined,
                          size: 42,
                          color: AppColors.textMuted,
                        ),
                        const SizedBox(height: 10),
                        const Text(
                          'কোনো রিকোয়েস্ট পাওয়া যায়নি',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            color: AppColors.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 12),
                        FilledButton(
                          onPressed: () => showReportGarbageSheet(context),
                          child: const Text('রাস্তার ময়লা রিপোর্ট করুন'),
                        ),
                      ],
                    ),
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
                  itemCount: items.length,
                  itemBuilder: (context, index) {
                    final item = items[index];
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: item.pickup != null
                          ? _PickupItemCard(pickup: item.pickup!)
                          : _ReportItemCard(report: item.report!),
                    );
                  },
                ),
        ),
      ],
    );
  }
}

class _ActivityEntry {
  const _ActivityEntry.pickup(this.pickup) : report = null;
  const _ActivityEntry.report(this.report) : pickup = null;

  final PickupRequest? pickup;
  final HotspotReport? report;
}

class _FilterPill extends StatelessWidget {
  const _FilterPill({
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
        fontSize: 13.5,
        fontWeight: selected ? FontWeight.w700 : FontWeight.w600,
        color: selected ? AppColors.primaryGreenDark : AppColors.textSecondary,
      ),
      onSelected: (_) => onTap(),
    );
  }
}

class _PickupItemCard extends StatelessWidget {
  const _PickupItemCard({required this.pickup});

  final PickupRequest pickup;

  @override
  Widget build(BuildContext context) {
    final tone = switch (pickup.status) {
      PickupStatus.pending => BadgeTone.amber,
      PickupStatus.assigned || PickupStatus.inProgress => BadgeTone.blue,
      PickupStatus.collected => BadgeTone.green,
    };

    return FlatCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              StatusBadge(
                label: 'পিকআপ • ${pickup.trackingCode}',
                tone: BadgeTone.neutral,
                icon: Icons.delete_sweep_outlined,
              ),
              const Spacer(),
              StatusBadge(label: pickup.status.labelBn, tone: tone),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            pickup.category.labelBn,
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 3),
          Text(
            '${pickup.addressLine} • ${pickup.slot.labelBn}',
            style: const TextStyle(
              fontSize: 13.5,
              color: AppColors.textSecondary,
              height: 1.4,
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Text(
                '${BanglaFormatters.formatInt(pickup.estimatedBags)}টি ব্যাগ',
                style: const TextStyle(
                  fontSize: 12.5,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textMuted,
                ),
              ),
              const Text(' • ', style: TextStyle(color: AppColors.textMuted)),
              Expanded(
                child: Text(
                  pickup.createdAtLabel,
                  style: const TextStyle(
                    fontSize: 12.5,
                    color: AppColors.textMuted,
                  ),
                ),
              ),
              if (pickup.assignedVehicleCode != null)
                Text(
                  'ভ্যান: ${pickup.assignedVehicleCode}',
                  style: const TextStyle(
                    fontSize: 12.5,
                    fontWeight: FontWeight.w700,
                    color: AppColors.primaryGreenDark,
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

class _ReportItemCard extends StatelessWidget {
  const _ReportItemCard({required this.report});

  final HotspotReport report;

  @override
  Widget build(BuildContext context) {
    final tone = switch (report.status) {
      HotspotStatus.reported => BadgeTone.amber,
      HotspotStatus.verified || HotspotStatus.dispatched => BadgeTone.blue,
      HotspotStatus.cleared => BadgeTone.green,
    };

    return FlatCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              StatusBadge(
                label: 'রিপোর্ট • ${report.trackingCode}',
                tone: BadgeTone.neutral,
                icon: Icons.camera_alt_outlined,
              ),
              const Spacer(),
              StatusBadge(label: report.status.labelBn, tone: tone),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            report.primaryTitleBn,
            style: const TextStyle(
              fontSize: 15.5,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            report.note,
            style: const TextStyle(
              fontSize: 13.5,
              color: AppColors.textSecondary,
              height: 1.4,
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              const Icon(
                Icons.location_on_outlined,
                size: 15,
                color: AppColors.primaryGreen,
              ),
              const SizedBox(width: 4),
              Expanded(
                child: Text(
                  '${report.landmark} • ${BanglaFormatters.formatCoordinates(report.lat, report.lng)}',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppColors.textMuted,
                  ),
                ),
              ),
              const SizedBox(width: 6),
              Text(
                report.reportedAtLabel,
                style: const TextStyle(
                  fontSize: 12,
                  color: AppColors.textMuted,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
