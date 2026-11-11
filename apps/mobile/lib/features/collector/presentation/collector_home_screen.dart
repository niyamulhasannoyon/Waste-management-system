import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/providers/collector_state_provider.dart';
import 'widgets/collector_duty_header.dart';
import 'widgets/route_stop_card.dart';

class CollectorHomeScreen extends ConsumerWidget {
  const CollectorHomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final stops = ref.watch(
      collectorStateProvider.select((state) => state.stops),
    );

    return Scaffold(
      body: ListView.builder(
        padding: const EdgeInsets.fromLTRB(16, 14, 16, 28),
        itemCount: stops.length + 1,
        itemBuilder: (context, index) {
          if (index == 0) {
            return const Padding(
              padding: EdgeInsets.only(bottom: 12),
              child: CollectorDutyHeader(),
            );
          }

          final stop = stops[index - 1];
          return Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: RouteStopCard(
              key: ValueKey(stop.id),
              stop: stop,
              orderNumber: index,
            ),
          );
        },
      ),
    );
  }
}
