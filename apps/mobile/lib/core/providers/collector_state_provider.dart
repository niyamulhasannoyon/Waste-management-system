import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../constants/savar_seed_data.dart';
import '../models/route_stop.dart';

class CollectorState {
  const CollectorState({
    required this.workerName,
    required this.vehicleCode,
    required this.routeLabel,
    required this.isOnDuty,
    required this.isNetworkOnline,
    required this.pendingSyncCount,
    required this.stops,
  });

  final String workerName;
  final String vehicleCode;
  final String routeLabel;
  final bool isOnDuty;
  final bool isNetworkOnline;
  final int pendingSyncCount;
  final List<RouteStop> stops;

  int get completedCount => stops.where((stop) => stop.isCompleted).length;

  double get totalCollectedKg => stops.fold<double>(
        0.0,
        (sum, stop) => sum + (stop.isCompleted ? (stop.weightKg ?? 0.0) : 0.0),
      );

  CollectorState copyWith({
    bool? isOnDuty,
    bool? isNetworkOnline,
    int? pendingSyncCount,
    List<RouteStop>? stops,
  }) {
    return CollectorState(
      workerName: workerName,
      vehicleCode: vehicleCode,
      routeLabel: routeLabel,
      isOnDuty: isOnDuty ?? this.isOnDuty,
      isNetworkOnline: isNetworkOnline ?? this.isNetworkOnline,
      pendingSyncCount: pendingSyncCount ?? this.pendingSyncCount,
      stops: stops ?? this.stops,
    );
  }
}

class CollectorStateNotifier extends Notifier<CollectorState> {
  @override
  CollectorState build() {
    return const CollectorState(
      workerName: 'মোঃ আলমগীর',
      vehicleCode: 'SV-VAN-04',
      routeLabel: 'ওয়ার্ড ৩ — ব্যাংক টাউন ও নামা বাজার',
      isOnDuty: false,
      isNetworkOnline: true,
      pendingSyncCount: 3,
      stops: SavarSeedData.initialRouteStops,
    );
  }

  void toggleDuty() {
    state = state.copyWith(isOnDuty: !state.isOnDuty);
  }

  void toggleNetworkOnline() {
    state = state.copyWith(isNetworkOnline: !state.isNetworkOnline);
  }

  void verifyStopQr(String stopId) {
    final updated = [
      for (final stop in state.stops)
        if (stop.id == stopId) stop.copyWith(qrVerified: true) else stop,
    ];
    state = state.copyWith(stops: updated);
  }

  void updateStopWeight(String stopId, double? weightKg) {
    final updated = [
      for (final stop in state.stops)
        if (stop.id == stopId) stop.copyWith(weightKg: weightKg) else stop,
    ];
    state = state.copyWith(stops: updated);
  }

  void completeStop(String stopId, {required double weightKg}) {
    final synced = state.isNetworkOnline;
    var newlyQueued = false;
    final updated = <RouteStop>[];

    for (final stop in state.stops) {
      if (stop.id == stopId) {
        if (!stop.isCompleted && !synced) {
          newlyQueued = true;
        }
        updated.add(
          stop.copyWith(
            isCompleted: true,
            weightKg: weightKg,
            completedAtLabel: 'এইমাত্র সম্পন্ন',
            syncedToServer: synced,
          ),
        );
      } else {
        updated.add(stop);
      }
    }

    state = state.copyWith(
      stops: updated,
      pendingSyncCount:
          newlyQueued ? state.pendingSyncCount + 1 : state.pendingSyncCount,
    );
  }

  void reopenStop(String stopId) {
    final updated = [
      for (final stop in state.stops)
        if (stop.id == stopId) stop.copyWith(isCompleted: false) else stop,
    ];
    state = state.copyWith(stops: updated);
  }

  bool syncPendingRecords() {
    if (!state.isNetworkOnline || state.pendingSyncCount == 0) {
      return false;
    }

    final updated = [
      for (final stop in state.stops)
        stop.syncedToServer ? stop : stop.copyWith(syncedToServer: true),
    ];

    state = state.copyWith(
      stops: updated,
      pendingSyncCount: 0,
    );
    return true;
  }
}

final collectorStateProvider =
    NotifierProvider<CollectorStateNotifier, CollectorState>(
  CollectorStateNotifier.new,
);
