// ignore: deprecated_member_use
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/constants/app_colors.dart';
import '../../../../core/models/pickup_request.dart';
import '../../../../core/providers/citizen_state_provider.dart';
import '../../../../core/widgets/flat_card.dart';
import '../../../../core/widgets/status_badge.dart';
import '../widgets/citizen_top_bar.dart';
import '../widgets/eco_points_segregation_section.dart';
import '../widgets/next_pickup_card.dart';
import '../widgets/primary_action_cards.dart';
import '../widgets/report_garbage_sheet.dart';
import '../widgets/request_pickup_sheet.dart';

class CitizenHomeScreen extends ConsumerWidget {
  const CitizenHomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final latestPickup = ref.watch(
      citizenStateProvider.select(
        (state) => state.pickups.isNotEmpty ? state.pickups.first : null,
      ),
    );

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 24),
      children: [
        const CitizenTopBar(),
        const SizedBox(height: 16),
        const NextPickupCard(),
        const SizedBox(height: 14),
        PrimaryActionCards(
          onRequestPickup: () => showRequestPickupSheet(context),
          onReportGarbage: () => showReportGarbageSheet(context),
        ),
        const SizedBox(height: 18),
        const EcoPointsSegregationSection(),
        if (latestPickup != null) ...[
          const SizedBox(height: 18),
          _LatestActivityCard(
            pickup: latestPickup,
            onViewAll: () =>
                ref.read(citizenStateProvider.notifier).setTab(1),
          ),
        ],
      ],
    );
  }
}

class _LatestActivityCard extends StatelessWidget {
  const _LatestActivityCard({
    required this.pickup,
    required this.onViewAll,
  });

  final PickupRequest pickup;
  final VoidCallback onViewAll;

  @override
  Widget build(BuildContext context) {
    final badgeTone = switch (pickup.status) {
      PickupStatus.pending => BadgeTone.amber,
      PickupStatus.assigned || PickupStatus.inProgress => BadgeTone.blue,
      PickupStatus.collected => BadgeTone.green,
    };

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Expanded(
              child: Text(
                'সর্বশেষ রিকোয়েস্ট',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textPrimary,
                ),
              ),
            ),
            TextButton(
              onPressed: onViewAll,
              child: const Text('সব দেখুন'),
            ),
          ],
        ),
        FlatCard(
          onTap: onViewAll,
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  color: AppColors.neutralSurface,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppColors.border, width: 1),
                ),
                child: const Icon(
                  Icons.receipt_long_outlined,
                  color: AppColors.textPrimary,
                  size: 20,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '${pickup.trackingCode} • ${pickup.category.labelBn}',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 14.5,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      '${pickup.slot.labelBn} • ${pickup.createdAtLabel}',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 12.5,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              StatusBadge(
                label: pickup.status.labelBn,
                tone: badgeTone,
              ),
            ],
          ),
        ),
      ],
    );
  }
}
