import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/constants/app_colors.dart';
import '../../../../core/providers/collector_state_provider.dart';
import '../../../../core/utils/bangla_formatters.dart';
import '../../../../core/widgets/flat_card.dart';

class CollectorDutyHeader extends ConsumerWidget {
  const CollectorDutyHeader({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final collector = ref.watch(collectorStateProvider);
    final totalStops = collector.stops.length;
    final completedStops = collector.completedCount;
    final remainingStops = totalStops - completedStops;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // High-contrast Worker Identity Bar
        FlatCard(
          borderColor: AppColors.borderStrong,
          borderWidth: 1.5,
          child: Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: AppColors.primaryGreenTint,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: AppColors.primaryGreenBorder,
                    width: 1.5,
                  ),
                ),
                child: const Icon(
                  Icons.cleaning_services_rounded,
                  color: AppColors.primaryGreenDark,
                  size: 26,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'পরিচ্ছন্নতাকর্মী অ্যাপ',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                        height: 1.25,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${collector.workerName} • ${collector.vehicleCode}',
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: AppColors.primaryGreenDark,
                      ),
                    ),
                    Text(
                      collector.routeLabel,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 12.5,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),

        // Large Outdoor-Readable Duty Toggle (min 56px height)
        Semantics(
          button: true,
          toggled: collector.isOnDuty,
          label: collector.isOnDuty
              ? 'ডিউটি চালু আছে, বিরতি নিতে ট্যাপ করুন'
              : 'ডিউটি ও জিপিএস চালু করতে ট্যাপ করুন',
          child: Material(
            color: collector.isOnDuty
                ? AppColors.primaryGreen
                : AppColors.textPrimary,
            borderRadius: BorderRadius.circular(12),
            child: InkWell(
              onTap: () =>
                  ref.read(collectorStateProvider.notifier).toggleDuty(),
              borderRadius: BorderRadius.circular(12),
              child: ConstrainedBox(
                constraints: const BoxConstraints(minHeight: 60),
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 12,
                  ),
                  child: Row(
                    children: [
                      Icon(
                        collector.isOnDuty
                            ? Icons.radio_button_checked_rounded
                            : Icons.play_circle_fill_rounded,
                        color: Colors.white,
                        size: 30,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              collector.isOnDuty
                                  ? 'অনলাইন • ডিউটি চালু আছে'
                                  : 'কাজ শুরু করুন',
                              style: const TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.w700,
                                color: Colors.white,
                                height: 1.25,
                              ),
                            ),
                            Text(
                              collector.isOnDuty
                                  ? 'বিরতি নিতে চাইলে ট্যাপ করুন'
                                  : 'ডিউটি ও জিপিএস চালু করতে ট্যাপ করুন',
                              style: const TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w500,
                                color: Colors.white,
                                height: 1.3,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 8,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          collector.isOnDuty ? 'অনলাইন' : 'শুরু',
                          style: TextStyle(
                            fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: collector.isOnDuty
                              ? AppColors.primaryGreenDark
                              : AppColors.textPrimary,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
        ),
        const SizedBox(height: 10),

        // Offline Sync Indicator Badge + Network Simulation Toggle
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: collector.pendingSyncCount > 0
                ? AppColors.warningAmberTint
                : AppColors.primaryGreenTint,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: collector.pendingSyncCount > 0
                  ? AppColors.warningAmber
                  : AppColors.primaryGreen,
              width: 1.5,
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  Icon(
                    collector.pendingSyncCount > 0
                        ? Icons.cloud_upload_outlined
                        : Icons.cloud_done_outlined,
                    size: 24,
                    color: collector.pendingSyncCount > 0
                        ? AppColors.warningAmberDark
                        : AppColors.primaryGreenDark,
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      BanglaFormatters.formatPendingSyncBadge(
                        collector.pendingSyncCount,
                      ),
                      style: TextStyle(
                        fontSize: 15.5,
                        fontWeight: FontWeight.w700,
                        color: collector.pendingSyncCount > 0
                            ? AppColors.warningAmberDark
                            : AppColors.primaryGreenDark,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => ref
                          .read(collectorStateProvider.notifier)
                          .toggleNetworkOnline(),
                      style: OutlinedButton.styleFrom(
                        minimumSize: const Size(48, 52),
                        backgroundColor: AppColors.cardSurface,
                        side: BorderSide(
                          color: collector.isNetworkOnline
                              ? AppColors.primaryGreen
                              : AppColors.dangerRed,
                          width: 1.5,
                        ),
                      ),
                      icon: Icon(
                        collector.isNetworkOnline
                            ? Icons.wifi_rounded
                            : Icons.wifi_off_rounded,
                        size: 20,
                        color: collector.isNetworkOnline
                            ? AppColors.primaryGreenDark
                            : AppColors.dangerRed,
                      ),
                      label: Text(
                        collector.isNetworkOnline ? 'নেট: অনলাইন' : 'নেট: অফলাইন',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: collector.isNetworkOnline
                              ? AppColors.primaryGreenDark
                              : AppColors.dangerRed,
                        ),
                      ),
                    ),
                  ),
                  if (collector.pendingSyncCount > 0) ...[
                    const SizedBox(width: 10),
                    Expanded(
                      child: FilledButton.icon(
                        onPressed: collector.isNetworkOnline
                            ? () async {
                                final messenger = ScaffoldMessenger.of(context);
                                final ok = await ref
                                    .read(collectorStateProvider.notifier)
                                    .syncPendingRecords();
                                if (!context.mounted) return;
                                messenger
                                  ..hideCurrentSnackBar()
                                  ..showSnackBar(
                                    SnackBar(
                                      content: Text(
                                        ok
                                            ? 'অপেক্ষমাণ সব তথ্য সার্ভারে আপলোড সম্পন্ন হয়েছে ✓'
                                            : 'সার্ভারে সিঙ্ক করা যায়নি — নেটওয়ার্ক বা লগইন পরীক্ষা করুন',
                                      ),
                                    ),
                                  );
                              }
                            : null,
                        style: FilledButton.styleFrom(
                          minimumSize: const Size(48, 52),
                          backgroundColor: AppColors.warningAmberDark,
                          foregroundColor: Colors.white,
                        ),
                        icon: const Icon(Icons.sync_rounded, size: 20),
                        label: const Text('সিঙ্ক করুন'),
                      ),
                    ),
                  ],
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),

        // Today's Route Progress Summary
        Row(
          children: [
            Expanded(
              child: _SummaryMetricTile(
                label: 'বাকি বাসা',
                value: '${BanglaFormatters.formatInt(remainingStops)}টি',
                accent: AppColors.textPrimary,
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: _SummaryMetricTile(
                label: 'সম্পন্ন',
                value: '${BanglaFormatters.formatInt(completedStops)}টি',
                accent: AppColors.primaryGreenDark,
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: _SummaryMetricTile(
                label: 'মোট ওজন',
                value: BanglaFormatters.formatWeightKg(
                  collector.totalCollectedKg,
                ),
                accent: AppColors.infoBlueDark,
              ),
            ),
          ],
        ),
        const SizedBox(height: 14),
        const Text(
          'আজকের নির্ধারিত রুট',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: AppColors.textPrimary,
          ),
        ),
      ],
    );
  }
}

class _SummaryMetricTile extends StatelessWidget {
  const _SummaryMetricTile({
    required this.label,
    required this.value,
    required this.accent,
  });

  final String label;
  final String value;
  final Color accent;

  @override
  Widget build(BuildContext context) {
    return FlatCard(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
      borderColor: AppColors.borderStrong,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: AppColors.textSecondary,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            value,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: 16.5,
              fontWeight: FontWeight.w700,
              color: accent,
            ),
          ),
        ],
      ),
    );
  }
}
