import 'dart:convert';

import 'package:clean_savar_core/clean_savar_core.dart' as core;
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../utils/local_file_bytes.dart';

class PendingSyncAction {
  const PendingSyncAction({
    required this.id,
    required this.type,
    required this.payload,
    required this.createdAtIso,
  });

  final String id;
  final String type; // pickup_create | report_create | collector_complete
  final Map<String, dynamic> payload;
  final String createdAtIso;

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'type': type,
      'payload': payload,
      'createdAtIso': createdAtIso,
    };
  }

  factory PendingSyncAction.fromJson(Map<String, dynamic> json) {
    return PendingSyncAction(
      id: json['id'] as String,
      type: json['type'] as String,
      payload: Map<String, dynamic>.from(json['payload'] as Map),
      createdAtIso: json['createdAtIso'] as String,
    );
  }
}

class SyncFlushResult {
  const SyncFlushResult({
    required this.syncedActionIds,
    required this.remainingCount,
    this.conflictMessages = const [],
  });

  final Set<String> syncedActionIds;
  final int remainingCount;
  final List<String> conflictMessages;
}

class OfflineSyncStore {
  static const String citizenStateKey = 'clean_savar_citizen_state_v1';
  static const String collectorStateKey = 'clean_savar_collector_state_v1';
  static const String syncQueueKey = 'clean_savar_pending_sync_v1';
  static const String authSessionKey = 'clean_savar_auth_v1';

  Future<SharedPreferences?> _prefs() async {
    try {
      return await SharedPreferences.getInstance();
    } on MissingPluginException {
      return null;
    } catch (_) {
      return null;
    }
  }

  Future<Map<String, dynamic>?> readJsonMap(String key) async {
    final prefs = await _prefs();
    if (prefs == null) return null;
    final raw = prefs.getString(key);
    if (raw == null || raw.isEmpty) return null;
    try {
      final decoded = jsonDecode(raw);
      if (decoded is Map<String, dynamic>) return decoded;
    } catch (_) {}
    return null;
  }

  Future<void> writeJsonMap(String key, Map<String, dynamic> data) async {
    final prefs = await _prefs();
    if (prefs == null) return;
    await prefs.setString(key, jsonEncode(data));
  }

  Future<List<PendingSyncAction>> loadSyncQueue() async {
    final prefs = await _prefs();
    if (prefs == null) return const [];
    final raw = prefs.getString(syncQueueKey);
    if (raw == null || raw.isEmpty) return const [];
    try {
      final list = jsonDecode(raw) as List<dynamic>;
      return list
          .map((e) => PendingSyncAction.fromJson(Map<String, dynamic>.from(e as Map)))
          .toList();
    } catch (_) {
      return const [];
    }
  }

  Future<void> saveSyncQueue(List<PendingSyncAction> queue) async {
    final prefs = await _prefs();
    if (prefs == null) return;
    await prefs.setString(
      syncQueueKey,
      jsonEncode(queue.map((e) => e.toJson()).toList()),
    );
  }

  Future<List<PendingSyncAction>> enqueue(PendingSyncAction action) async {
    final existing = await loadSyncQueue();
    final updated = [...existing.where((e) => e.id != action.id), action];
    await saveSyncQueue(updated);
    return updated;
  }

  Future<SyncFlushResult> flushQueue(core.CleanSavarApiClient client) async {
    final queue = await loadSyncQueue();
    if (queue.isEmpty) {
      return const SyncFlushResult(syncedActionIds: {}, remainingCount: 0);
    }

    final remaining = <PendingSyncAction>[];
    final syncedIds = <String>{};
    final conflicts = <String>[];

    for (final action in queue) {
      try {
        await _dispatchAction(client, action);
        syncedIds.add(action.id);
      } on core.CleanSavarApiException catch (e) {
        if (e.statusCode == 400 ||
            e.statusCode == 404 ||
            e.statusCode == 409 ||
            e.statusCode == 413 ||
            e.statusCode == 422) {
          // Drop non-retriable validation/conflict action (e.g. 409 50m duplicate)
          conflicts.add(e.message);
        } else {
          // Keep 401/403/5xx in queue so user can sign in or retry later.
          remaining.add(action);
        }
      } catch (_) {
        remaining.add(action);
      }
    }

    await saveSyncQueue(remaining);
    return SyncFlushResult(
      syncedActionIds: syncedIds,
      remainingCount: remaining.length,
      conflictMessages: conflicts,
    );
  }

  Future<void> _dispatchAction(
    core.CleanSavarApiClient client,
    PendingSyncAction action,
  ) async {
    final p = action.payload;
    switch (action.type) {
      case 'pickup_create':
        await client.submitPickup(
          citizenName: (p['citizenName'] as String?) ?? 'নাগরিক অ্যাপ ব্যবহারকারী',
          citizenPhone: (p['citizenPhone'] as String?) ?? '01715-883210',
          wardId: (p['wardId'] as num?)?.toInt() ?? 5,
          addressLine: p['addressLine'] as String,
          landmark: (p['landmark'] as String?) ?? 'সাভার',
          wasteType: core.WasteType.values.firstWhere(
            (e) => e.apiValue == p['wasteType'],
            orElse: () => core.WasteType.household,
          ),
          slot: core.PickupSlot.values.firstWhere(
            (e) => e.apiValue == p['slot'],
            orElse: () => core.PickupSlot.morning,
          ),
          estimatedBags: (p['estimatedBags'] as num?)?.toInt() ?? 2,
          lat: (p['lat'] as num?)?.toDouble(),
          lng: (p['lng'] as num?)?.toDouble(),
          scheduleType: (p['scheduleType'] as String?) ?? 'one_time',
          preferredDay: p['preferredDay'] as String?,
          notes: (p['notes'] as String?) ?? '',
        );
        return;

      case 'report_create':
        final photoUrls = <String>[];
        final photoBase64 = p['photoBase64'] as String?;
        final photoPath = p['photoPath'] as String?;
        Uint8List? uploadBytes;
        if (photoBase64 != null && photoBase64.isNotEmpty) {
          try {
            uploadBytes = base64Decode(photoBase64);
          } catch (_) {}
        } else if (photoPath != null && photoPath.isNotEmpty) {
          uploadBytes = await readLocalFileBytes(photoPath);
        }
        if (uploadBytes != null && uploadBytes.isNotEmpty) {
          final uploaded = await client.uploadPhotoBytes(uploadBytes);
          photoUrls.add(uploaded);
        }
        await client.submitDumpReport(
          reporterPhone: (p['reporterPhone'] as String?) ?? '01715-883210',
          wardId: (p['wardId'] as num?)?.toInt() ?? 5,
          titleBn: p['titleBn'] as String,
          landmark: p['landmark'] as String,
          severity: core.ReportSeverity.values.firstWhere(
            (e) => e.apiValue == p['severity'],
            orElse: () => core.ReportSeverity.medium,
          ),
          lat: (p['lat'] as num).toDouble(),
          lng: (p['lng'] as num).toDouble(),
          photoUrls: photoUrls,
        );
        return;

      case 'collector_complete':
        final targetId = p['stopId'] as String;
        // Seed stop IDs (e.g. 'stop-01') have no server UUID unless hydrated from API;
        // only invoke server completion endpoint for server UUID task IDs.
        final isServerUuid = RegExp(
          r'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
        ).hasMatch(targetId);
        if (!isServerUuid) {
          return;
        }
        await client.completeCollectorTask(
          id: targetId,
          weightKg: (p['weightKg'] as num).toDouble(),
          idempotencyKey: action.id,
          qrVerified: (p['qrVerified'] as bool?) ?? false,
          taskKind: (p['taskKind'] as String?) ?? 'pickup',
        );
        return;
    }
  }
}

final offlineSyncStoreProvider = Provider<OfflineSyncStore>(
  (ref) => OfflineSyncStore(),
);
