import 'dart:async';

import 'package:clean_savar_core/clean_savar_core.dart' as core;
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../constants/savar_seed_data.dart';
import '../models/route_stop.dart';
import '../services/device_services.dart';
import '../services/offline_sync_service.dart';

class CollectorState {
  const CollectorState({
    required this.workerName,
    required this.vehicleCode,
    required this.routeLabel,
    required this.isOnDuty,
    required this.isNetworkOnline,
    required this.pendingSyncCount,
    required this.stops,
    this.vehicleId,
  });

  final String workerName;
  final String vehicleCode;
  final String routeLabel;
  final bool isOnDuty;
  final bool isNetworkOnline;
  final int pendingSyncCount;
  final List<RouteStop> stops;
  final String? vehicleId;

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
    String? vehicleId,
  }) {
    return CollectorState(
      workerName: workerName,
      vehicleCode: vehicleCode,
      routeLabel: routeLabel,
      isOnDuty: isOnDuty ?? this.isOnDuty,
      isNetworkOnline: isNetworkOnline ?? this.isNetworkOnline,
      pendingSyncCount: pendingSyncCount ?? this.pendingSyncCount,
      stops: stops ?? this.stops,
      vehicleId: vehicleId ?? this.vehicleId,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'isOnDuty': isOnDuty,
      'isNetworkOnline': isNetworkOnline,
      'pendingSyncCount': pendingSyncCount,
      'vehicleId': vehicleId,
      'stops': stops.map((s) => s.toJson()).toList(),
    };
  }
}

class CollectorStateNotifier extends Notifier<CollectorState> {
  bool _hydrated = false;

  core.CleanSavarApiClient get _api => ref.read(apiClientProvider);
  OfflineSyncStore get _store => ref.read(offlineSyncStoreProvider);
  DeviceLocationService get _location => ref.read(deviceLocationServiceProvider);

  @override
  CollectorState build() {
    if (!_hydrated) {
      _hydrated = true;
      Future.microtask(_hydrateFromStorageAndServer);
    }
    return const CollectorState(
      workerName: 'মোঃ আলমগীর',
      vehicleCode: 'SV-VAN-04',
      routeLabel: 'ওয়ার্ড ০৫ — ব্যাংক টাউন ও পাকিজা এলাকা',
      isOnDuty: false,
      isNetworkOnline: true,
      pendingSyncCount: 3,
      stops: SavarSeedData.initialRouteStops,
    );
  }

  Future<void> _hydrateFromStorageAndServer() async {
    final saved = await _store.readJsonMap(OfflineSyncStore.collectorStateKey);
    if (saved != null) {
      try {
        final stops = (saved['stops'] as List<dynamic>?)
                ?.map((e) => RouteStop.fromJson(Map<String, dynamic>.from(e as Map)))
                .toList() ??
            state.stops;
        state = state.copyWith(
          isOnDuty: (saved['isOnDuty'] as bool?) ?? state.isOnDuty,
          isNetworkOnline:
              (saved['isNetworkOnline'] as bool?) ?? state.isNetworkOnline,
          pendingSyncCount:
              (saved['pendingSyncCount'] as num?)?.toInt() ?? state.pendingSyncCount,
          vehicleId: saved['vehicleId'] as String?,
          stops: stops,
        );
      } catch (_) {}
    }

    if (state.isNetworkOnline) {
      await _refreshAssignedStops();
    }
  }

  Future<void> _persist() async {
    await _store.writeJsonMap(OfflineSyncStore.collectorStateKey, state.toJson());
  }

  Future<void> _refreshAssignedStops() async {
    try {
      if (_api.authToken == null) {
        final auth = await _store.readJsonMap(OfflineSyncStore.authSessionKey);
        if (auth != null &&
            auth['token'] is String &&
            (auth['token'] as String).isNotEmpty) {
          _api.setAuthToken(auth['token'] as String);
        }
      }
      if (_api.authToken == null) {
        return;
      }
      final pickups = await _api.fetchPickups();
      if (pickups.isEmpty) return;

      final existingIds = state.stops.map((s) => s.id).toSet();
      final newServerStops = pickups
          .where((p) => !existingIds.contains(p.id))
          .map(RouteStop.fromCorePickup)
          .toList();

      if (newServerStops.isNotEmpty) {
        state = state.copyWith(stops: [...newServerStops, ...state.stops]);
        await _persist();
      }
    } catch (_) {
      // Retain cached/seed route when backend is offline
    }
  }

  void toggleDuty() {
    final nextDuty = !state.isOnDuty;
    state = state.copyWith(isOnDuty: nextDuty);
    unawaited(_persist());
    if (nextDuty && state.isNetworkOnline) {
      unawaited(_pingVehicleLocation());
    }
  }

  Future<void> _pingVehicleLocation() async {
    final fix = await _location.getCurrentLocation();
    if (fix == null) return;
    final vehicleId = state.vehicleId ?? state.vehicleCode;
    try {
      await _api.pingVehicleLocation(vehicleId, fix.lat, fix.lng);
    } catch (_) {}
  }

  void toggleNetworkOnline() {
    final nextOnline = !state.isNetworkOnline;
    state = state.copyWith(isNetworkOnline: nextOnline);
    unawaited(_persist());
    if (nextOnline) {
      unawaited(syncPendingRecords());
    }
  }

  void verifyStopQr(String stopId) {
    final updated = [
      for (final stop in state.stops)
        if (stop.id == stopId) stop.copyWith(qrVerified: true) else stop,
    ];
    state = state.copyWith(stops: updated);
    unawaited(_persist());
  }

  void updateStopWeight(String stopId, double? weightKg) {
    final updated = [
      for (final stop in state.stops)
        if (stop.id == stopId) stop.copyWith(weightKg: weightKg) else stop,
    ];
    state = state.copyWith(stops: updated);
    unawaited(_persist());
  }

  void completeStop(String stopId, {required double weightKg}) {
    final online = state.isNetworkOnline;
    final idempotencyKey =
        'collect-$stopId-${DateTime.now().microsecondsSinceEpoch}';
    var newlyQueued = false;
    RouteStop? targetStop;
    final updated = <RouteStop>[];

    for (final stop in state.stops) {
      if (stop.id == stopId) {
        if (!stop.isCompleted && !online) {
          newlyQueued = true;
        }
        final next = stop.copyWith(
          isCompleted: true,
          weightKg: weightKg,
          completedAtLabel: 'এইমাত্র সম্পন্ন',
          syncedToServer: online,
          idempotencyKey: idempotencyKey,
        );
        targetStop = next;
        updated.add(next);
      } else {
        updated.add(stop);
      }
    }

    state = state.copyWith(
      stops: updated,
      pendingSyncCount:
          newlyQueued ? state.pendingSyncCount + 1 : state.pendingSyncCount,
    );

    if (targetStop != null) {
      unawaited(_persistAndPushCompletion(targetStop, weightKg, idempotencyKey));
    }
  }

  Future<void> _persistAndPushCompletion(
    RouteStop stop,
    double weightKg,
    String idempotencyKey,
  ) async {
    await _persist();

    final isServerUuid = RegExp(
      r'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
    ).hasMatch(stop.id);

    if (!isServerUuid) {
      return;
    }

    if (state.isNetworkOnline) {
      try {
        await _api.completeCollectorTask(
          id: stop.id,
          weightKg: weightKg,
          idempotencyKey: idempotencyKey,
          qrVerified: stop.qrVerified,
          taskKind: stop.taskKind,
        );
        return;
      } catch (_) {}
    }

    final action = PendingSyncAction(
      id: idempotencyKey,
      type: 'collector_complete',
      createdAtIso: DateTime.now().toIso8601String(),
      payload: {
        'stopId': stop.id,
        'weightKg': weightKg,
        'qrVerified': stop.qrVerified,
        'taskKind': stop.taskKind,
      },
    );
    final queue = await _store.enqueue(action);
    state = state.copyWith(
      stops: [
        for (final s in state.stops)
          if (s.id == stop.id) s.copyWith(syncedToServer: false) else s,
      ],
      pendingSyncCount: queue.length,
    );
    await _persist();
  }

  void reopenStop(String stopId) {
    final updated = [
      for (final stop in state.stops)
        if (stop.id == stopId) stop.copyWith(isCompleted: false) else stop,
    ];
    state = state.copyWith(stops: updated);
    unawaited(_persist());
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
    unawaited(_flushQueueInBackground());
    return true;
  }

  Future<void> _flushQueueInBackground() async {
    await _persist();
    final res = await _store.flushQueue(_api);
    if (res.remainingCount > 0) {
      state = state.copyWith(pendingSyncCount: res.remainingCount);
      await _persist();
    }
  }
}

final collectorStateProvider =
    NotifierProvider<CollectorStateNotifier, CollectorState>(
  CollectorStateNotifier.new,
);
