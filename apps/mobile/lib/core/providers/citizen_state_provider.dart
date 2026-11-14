import 'dart:async';
import 'dart:convert';

import 'package:clean_savar_core/clean_savar_core.dart' as core;
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../config/app_build_config.dart';
import '../constants/savar_seed_data.dart';
import '../models/app_role.dart';
import '../models/hotspot_report.dart';
import '../models/pickup_request.dart';
import '../models/ward_info.dart';
import '../services/device_services.dart';
import '../services/offline_sync_service.dart';
import '../utils/local_file_bytes.dart';
import 'app_role_provider.dart';
import 'collector_state_provider.dart';

class CitizenState {
  const CitizenState({
    required this.citizenName,
    required this.citizenFullName,
    required this.citizenPhone,
    required this.defaultAddress,
    required this.selectedWard,
    required this.ecoPoints,
    required this.nextPickupWindow,
    required this.nextCollectorName,
    required this.nextCollectorVehicle,
    required this.nextCollectorPhone,
    required this.pickups,
    required this.hotspots,
    required this.notifications,
    required this.hasUnreadNotifications,
    required this.activeTabIndex,
    this.pendingSyncCount = 0,
    this.isRefreshing = false,
    this.isAuthenticated = false,
    this.isDemoPreview = false,
    this.authenticatedRole = 'citizen',
    this.otpPreview,
  });

  final String citizenName;
  final String citizenFullName;
  final String citizenPhone;
  final String defaultAddress;
  final WardInfo selectedWard;
  final int ecoPoints;
  final String nextPickupWindow;
  final String nextCollectorName;
  final String nextCollectorVehicle;
  final String nextCollectorPhone;
  final List<PickupRequest> pickups;
  final List<HotspotReport> hotspots;
  final List<String> notifications;
  final bool hasUnreadNotifications;
  final int activeTabIndex;
  final int pendingSyncCount;
  final bool isRefreshing;
  final bool isAuthenticated;
  final bool isDemoPreview;
  final String authenticatedRole;
  final String? otpPreview;

  CitizenState copyWith({
    String? citizenName,
    String? citizenFullName,
    String? citizenPhone,
    WardInfo? selectedWard,
    int? ecoPoints,
    List<PickupRequest>? pickups,
    List<HotspotReport>? hotspots,
    List<String>? notifications,
    bool? hasUnreadNotifications,
    int? activeTabIndex,
    int? pendingSyncCount,
    bool? isRefreshing,
    bool? isAuthenticated,
    bool? isDemoPreview,
    String? authenticatedRole,
    String? otpPreview,
    bool clearOtpPreview = false,
  }) {
    return CitizenState(
      citizenName: citizenName ?? this.citizenName,
      citizenFullName: citizenFullName ?? this.citizenFullName,
      citizenPhone: citizenPhone ?? this.citizenPhone,
      defaultAddress: defaultAddress,
      selectedWard: selectedWard ?? this.selectedWard,
      ecoPoints: ecoPoints ?? this.ecoPoints,
      nextPickupWindow: nextPickupWindow,
      nextCollectorName: nextCollectorName,
      nextCollectorVehicle: nextCollectorVehicle,
      nextCollectorPhone: nextCollectorPhone,
      pickups: pickups ?? this.pickups,
      hotspots: hotspots ?? this.hotspots,
      notifications: notifications ?? this.notifications,
      hasUnreadNotifications:
          hasUnreadNotifications ?? this.hasUnreadNotifications,
      activeTabIndex: activeTabIndex ?? this.activeTabIndex,
      pendingSyncCount: pendingSyncCount ?? this.pendingSyncCount,
      isRefreshing: isRefreshing ?? this.isRefreshing,
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
      isDemoPreview: isDemoPreview ?? this.isDemoPreview,
      authenticatedRole: authenticatedRole ?? this.authenticatedRole,
      otpPreview: clearOtpPreview ? null : (otpPreview ?? this.otpPreview),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'citizenName': citizenName,
      'citizenFullName': citizenFullName,
      'citizenPhone': citizenPhone,
      'selectedWard': selectedWard.toJson(),
      'ecoPoints': ecoPoints,
      'pickups': pickups.map((e) => e.toJson()).toList(),
      'hotspots': hotspots.map((e) => e.toJson()).toList(),
      'notifications': notifications,
      'hasUnreadNotifications': hasUnreadNotifications,
      'authenticatedRole': authenticatedRole,
    };
  }
}

class CitizenStateNotifier extends Notifier<CitizenState> {
  int _sequenceCounter = 45;
  bool _hydrated = false;

  core.CleanSavarApiClient get _api => ref.read(apiClientProvider);
  OfflineSyncStore get _store => ref.read(offlineSyncStoreProvider);

  @override
  CitizenState build() {
    if (!_hydrated) {
      _hydrated = true;
      Future.microtask(_hydrateAndSync);
    }
    return const CitizenState(
      citizenName: 'রাফি',
      citizenFullName: 'রাফি আহমেদ',
      citizenPhone: '01715-883210',
      defaultAddress: 'বাসা ১৪, রোড ২, ব্যাংক টাউন',
      selectedWard: SavarSeedData.defaultWard,
      ecoPoints: 120,
      nextPickupWindow: 'আগামীকাল সকাল ৯:০০ - ১০:০০',
      nextCollectorName: 'মোঃ আলমগীর',
      nextCollectorVehicle: 'SV-VAN-04',
      nextCollectorPhone: '01812-101002',
      pickups: SavarSeedData.initialPickups,
      hotspots: SavarSeedData.initialHotspots,
      notifications: SavarSeedData.citizenNotifications,
      hasUnreadNotifications: true,
      activeTabIndex: 0,
    );
  }

  Future<void> _hydrateAndSync() async {
    final saved = await _store.readJsonMap(OfflineSyncStore.citizenStateKey);
    if (saved != null) {
      try {
        final savedPickups = (saved['pickups'] as List<dynamic>?)
                ?.map((e) => PickupRequest.fromJson(Map<String, dynamic>.from(e as Map)))
                .toList() ??
            state.pickups;
        final savedHotspots = (saved['hotspots'] as List<dynamic>?)
                ?.map((e) => HotspotReport.fromJson(Map<String, dynamic>.from(e as Map)))
                .toList() ??
            state.hotspots;
        final savedWardJson = saved['selectedWard'] as Map<String, dynamic>?;
        final savedWard =
            savedWardJson != null ? WardInfo.fromJson(savedWardJson) : state.selectedWard;
        final savedNotifs = (saved['notifications'] as List<dynamic>?)
                ?.map((e) => e.toString())
                .toList() ??
            state.notifications;

        state = state.copyWith(
          citizenName: (saved['citizenName'] as String?) ?? state.citizenName,
          citizenFullName:
              (saved['citizenFullName'] as String?) ?? state.citizenFullName,
          citizenPhone: (saved['citizenPhone'] as String?) ?? state.citizenPhone,
          selectedWard: savedWard,
          ecoPoints: (saved['ecoPoints'] as num?)?.toInt() ?? state.ecoPoints,
          pickups: savedPickups,
          hotspots: savedHotspots,
          notifications: savedNotifs,
          hasUnreadNotifications:
              (saved['hasUnreadNotifications'] as bool?) ?? state.hasUnreadNotifications,
        );
      } catch (_) {}
    }

    final auth = await _store.readJsonMap(OfflineSyncStore.authSessionKey);
    if (auth != null &&
        auth['token'] is String &&
        (auth['token'] as String).isNotEmpty) {
      _api.setAuthToken(auth['token'] as String);
      final role = (auth['role'] as String?) ?? 'citizen';
      state = state.copyWith(
        isAuthenticated: true,
        authenticatedRole: role,
      );
      if (role == 'collector') {
        ref.read(appRoleProvider.notifier).setRole(AppRole.collector);
      }
    }

    await refreshFromServer();
  }

  Future<void> _persist() async {
    await _store.writeJsonMap(OfflineSyncStore.citizenStateKey, state.toJson());
  }

  Future<void> refreshFromServer() async {
    state = state.copyWith(isRefreshing: true);
    try {
      final flush = _api.authToken != null
          ? await _store.flushQueue(_api)
          : SyncFlushResult(
              syncedActionIds: const {},
              remainingCount: (await _store.loadSyncQueue()).length,
            );

      var serverPickups = const <PickupRequest>[];
      if (_api.authToken != null) {
        try {
          final rawPickups = await _api.fetchPickups();
          serverPickups = rawPickups.map(PickupRequest.fromCore).toList();
        } on core.CleanSavarApiException catch (e) {
          if (e.statusCode == 401) {
            _api.setAuthToken(null);
            await _store.writeJsonMap(OfflineSyncStore.authSessionKey, {});
            state = state.copyWith(isAuthenticated: false);
          }
        } catch (_) {}
      }

      var serverReports = const <HotspotReport>[];
      try {
        final rawReports = _api.authToken != null
            ? await _api.fetchReports()
            : await _api.fetchPublicHotspots();
        serverReports = rawReports.map(HotspotReport.fromCore).toList();
      } on core.CleanSavarApiException catch (e) {
        if (e.statusCode == 401) {
          try {
            final pubReports = await _api.fetchPublicHotspots();
            serverReports = pubReports.map(HotspotReport.fromCore).toList();
          } catch (_) {}
        }
      } catch (_) {}

      final unsyncedPickups = state.pickups.where((p) => !p.synced).toList();
      final unsyncedHotspots = state.hotspots.where((h) => !h.synced).toList();

      final mergedPickups = serverPickups.isNotEmpty
          ? [
              ...unsyncedPickups,
              ...serverPickups,
            ]
          : state.pickups;
      final mergedHotspots = serverReports.isNotEmpty
          ? [
              ...unsyncedHotspots,
              ...serverReports,
            ]
          : state.hotspots;

      var updatedNotifs = state.notifications;
      if (flush.conflictMessages.isNotEmpty) {
        updatedNotifs = [...flush.conflictMessages, ...updatedNotifs];
      }

      state = state.copyWith(
        pickups: mergedPickups,
        hotspots: mergedHotspots,
        notifications: updatedNotifs,
        hasUnreadNotifications: flush.conflictMessages.isNotEmpty
            ? true
            : state.hasUnreadNotifications,
        pendingSyncCount: flush.remainingCount,
        isRefreshing: false,
      );
      await _persist();
    } catch (_) {
      final queue = await _store.loadSyncQueue();
      state = state.copyWith(
        pendingSyncCount: queue.length,
        isRefreshing: false,
      );
    }
  }

  Future<core.OtpChallengeResult> requestCitizenOtp({
    String? phone,
    String? fullName,
    int? wardId,
  }) async {
    final targetPhone = (phone ?? state.citizenPhone).trim();
    final trimmedName = fullName?.trim();
    final effectiveName = (trimmedName != null && trimmedName.isNotEmpty)
        ? trimmedName
        : state.citizenFullName;
    final effectiveWardId = wardId ?? state.selectedWard.id;

    // Backend `/auth/otp-login` expects `citizen` (or empty) and resolves
    // collector/admin roles authoritatively from DB during `/auth/otp-verify`.
    final challenge = await _api.requestOtp(
      phone: targetPhone,
      role: 'citizen',
      fullName: effectiveName,
      wardId: effectiveWardId,
    );
    state = state.copyWith(
      citizenPhone: challenge.phone.isNotEmpty ? challenge.phone : targetPhone,
      citizenFullName: effectiveName,
      citizenName: effectiveName.split(' ').first,
      otpPreview: challenge.devOtpPreview,
    );
    await _persist();
    return challenge;
  }

  Future<core.OtpAuthResult> verifyCitizenOtp({
    required String otp,
    String? phone,
    AppRole expectedRole = AppRole.citizen,
  }) async {
    final targetPhone = (phone ?? state.citizenPhone).trim();
    final auth = await _api.verifyOtp(phone: targetPhone, otp: otp.trim());

    if (expectedRole == AppRole.collector &&
        auth.role != 'collector' &&
        auth.role != 'admin') {
      await _api.logout();
      await _store.writeJsonMap(OfflineSyncStore.authSessionKey, {});
      throw const core.CleanSavarApiException(
        403,
        'এই নম্বরটি পৌরসভার নিবন্ধিত পরিচ্ছন্নতাকর্মী হিসেবে যুক্ত নয়। অনুগ্রহ করে নাগরিক লগইন ব্যবহার করুন অথবা অনুমোদিত কর্মী নম্বর দিন।',
      );
    }

    await _store.writeJsonMap(OfflineSyncStore.authSessionKey, {
      'token': auth.token,
      'phone': auth.phone,
      'role': auth.role,
    });
    final resolvedFullName = (auth.nameBn != null && auth.nameBn!.trim().isNotEmpty)
        ? auth.nameBn!.trim()
        : state.citizenFullName;
    state = state.copyWith(
      citizenPhone: auth.phone.isNotEmpty ? auth.phone : targetPhone,
      citizenFullName: resolvedFullName,
      citizenName: resolvedFullName.split(' ').first,
      isAuthenticated: auth.token.isNotEmpty,
      isDemoPreview: false,
      authenticatedRole: auth.role,
      clearOtpPreview: true,
    );
    if (expectedRole == AppRole.collector || auth.role == 'collector') {
      ref.read(appRoleProvider.notifier).setRole(AppRole.collector);
      unawaited(ref.read(collectorStateProvider.notifier).refreshFromServer());
    } else {
      ref.read(appRoleProvider.notifier).setRole(AppRole.citizen);
      if (auth.role == 'admin') {
        unawaited(ref.read(collectorStateProvider.notifier).refreshFromServer());
      }
    }
    await _persist();
    await refreshFromServer();
    return auth;
  }

  Future<core.OtpAuthResult> loginWithFirebaseToken({
    String? idToken,
    String? accessToken,
    String? phone,
    AppRole expectedRole = AppRole.citizen,
    String? fullName,
    int? wardId,
  }) async {
    final targetPhone = (phone ?? state.citizenPhone).trim();
    final auth = await _api.loginWithFirebaseToken(
      idToken: idToken,
      accessToken: accessToken,
      phone: targetPhone,
      fullName: fullName ??
          (state.citizenFullName.isNotEmpty ? state.citizenFullName : null),
      wardId: wardId ?? state.selectedWard.id,
      role: expectedRole == AppRole.collector ? 'collector' : 'citizen',
    );

    if (expectedRole == AppRole.collector &&
        auth.role != 'collector' &&
        auth.role != 'admin') {
      await _api.logout();
      await _store.writeJsonMap(OfflineSyncStore.authSessionKey, {});
      throw const core.CleanSavarApiException(
        403,
        'এই নম্বরটি পৌরসভার নিবন্ধিত পরিচ্ছন্নতাকর্মী হিসেবে যুক্ত নয়। অনুগ্রহ করে নাগরিক লগইন ব্যবহার করুন অথবা অনুমোদিত কর্মী নম্বর দিন।',
      );
    }

    await _store.writeJsonMap(OfflineSyncStore.authSessionKey, {
      'token': auth.token,
      'phone': auth.phone,
      'role': auth.role,
    });
    final resolvedFullName =
        (auth.nameBn != null && auth.nameBn!.trim().isNotEmpty)
            ? auth.nameBn!.trim()
            : state.citizenFullName;
    state = state.copyWith(
      citizenPhone: auth.phone.isNotEmpty ? auth.phone : targetPhone,
      citizenFullName: resolvedFullName,
      citizenName: resolvedFullName.split(' ').first,
      isAuthenticated: auth.token.isNotEmpty,
      isDemoPreview: false,
      authenticatedRole: auth.role,
      clearOtpPreview: true,
    );
    if (expectedRole == AppRole.collector || auth.role == 'collector') {
      ref.read(appRoleProvider.notifier).setRole(AppRole.collector);
      unawaited(ref.read(collectorStateProvider.notifier).refreshFromServer());
    } else {
      ref.read(appRoleProvider.notifier).setRole(AppRole.citizen);
      if (auth.role == 'admin') {
        unawaited(ref.read(collectorStateProvider.notifier).refreshFromServer());
      }
    }
    await _persist();
    unawaited(refreshFromServer());
    return auth;
  }

  void enterDemoPreview({AppRole role = AppRole.citizen}) {
    if (!AppBuildConfig.enableDemoMode) return;
    ref.read(collectorStateProvider.notifier).loadDemoSample();
    ref.read(appRoleProvider.notifier).setRole(role);
    state = state.copyWith(
      isDemoPreview: true,
      activeTabIndex: 0,
      clearOtpPreview: true,
    );
  }

  Future<void> logoutCitizenAuth() async {
    await _api.logout();
    await _store.writeJsonMap(OfflineSyncStore.authSessionKey, {});
    state = state.copyWith(
      isAuthenticated: false,
      isDemoPreview: false,
      authenticatedRole: 'citizen',
      activeTabIndex: 0,
      clearOtpPreview: true,
    );
    ref.read(appRoleProvider.notifier).setRole(AppRole.citizen);
    unawaited(ref.read(collectorStateProvider.notifier).resetOnLogout());
    await _persist();
  }

  void setTab(int index) {
    if (state.activeTabIndex != index) {
      state = state.copyWith(activeTabIndex: index);
    }
  }

  void selectWard(WardInfo ward) {
    state = state.copyWith(selectedWard: ward);
    unawaited(_persist());
  }

  Future<void> selectWardByCoordinates(double lat, double lng) async {
    try {
      final ward = await _api.resolveWardByCoords(lat, lng);
      selectWard(WardInfo.fromCore(ward));
    } catch (_) {
      final offlineWard = core.resolveNearestWardOffline(lat, lng);
      selectWard(WardInfo.fromCore(offlineWard));
    }
  }

  void markNotificationsRead() {
    if (state.hasUnreadNotifications) {
      state = state.copyWith(hasUnreadNotifications: false);
      unawaited(_persist());
    }
  }

  String submitPickupRequest({
    required String addressLine,
    required WasteCategory category,
    required PickupSlot slot,
    required int estimatedBags,
    String scheduleType = 'one_time',
    String? preferredDay,
    String notes = '',
  }) {
    _sequenceCounter += 1;
    final code = 'CS-PK-${2000 + _sequenceCounter}';
    final localId = 'pk-$_sequenceCounter';
    final bonusPoints =
        (category == WasteCategory.organic || category == WasteCategory.recyclable)
            ? 20
            : 10;

    final resolvedAddress =
        addressLine.trim().isEmpty ? state.defaultAddress : addressLine.trim();
    final normalizedSchedule =
        scheduleType == 'recurring_weekly' ? 'recurring_weekly' : 'one_time';
    final resolvedPreferredDay =
        normalizedSchedule == 'recurring_weekly' ? (preferredDay ?? 'friday') : null;
    final trimmedNote = notes.trim();
    final combinedNotes = resolvedPreferredDay != null
        ? (trimmedNote.isEmpty
            ? 'সাপ্তাহিক পুনরাবৃত্তি ($resolvedPreferredDay)'
            : '$trimmedNote • সাপ্তাহিক ($resolvedPreferredDay)')
        : trimmedNote;

    final newRequest = PickupRequest(
      id: localId,
      trackingCode: code,
      addressLine: resolvedAddress,
      wardLabel: state.selectedWard.fullNameBn,
      wardId: state.selectedWard.id,
      scheduleType: normalizedSchedule,
      preferredDay: resolvedPreferredDay,
      category: category,
      slot: slot,
      estimatedBags: estimatedBags,
      status: PickupStatus.pending,
      createdAtLabel: 'এইমাত্র',
      assignedCollectorName: state.nextCollectorName,
      assignedVehicleCode: state.nextCollectorVehicle,
      notes: combinedNotes,
      synced: false,
    );

    state = state.copyWith(
      pickups: [newRequest, ...state.pickups],
      ecoPoints: state.ecoPoints + bonusPoints,
      notifications: [
        'পিকআপ রিকোয়েস্ট $code গ্রহণ করা হয়েছে (+$bonusPoints পয়েন্ট)।',
        ...state.notifications,
      ],
      hasUnreadNotifications: true,
    );

    unawaited(_persistAndSyncPickup(
      localId: localId,
      request: newRequest,
    ));

    return code;
  }

  Future<void> _persistAndSyncPickup({
    required String localId,
    required PickupRequest request,
  }) async {
    await _persist();
    try {
      final created = await _api.submitPickup(
        citizenName: state.citizenFullName,
        citizenPhone: state.citizenPhone,
        wardId: request.wardId,
        addressLine: request.addressLine,
        landmark: state.selectedWard.areaChipLabel,
        wasteType: request.category.toCoreWasteType(),
        slot: request.slot.toCoreSlot(),
        estimatedBags: request.estimatedBags,
        lat: state.selectedWard.lat,
        lng: state.selectedWard.lng,
        scheduleType: request.scheduleType,
        preferredDay: request.preferredDay,
        notes: request.notes,
      );

      state = state.copyWith(
        pickups: [
          for (final item in state.pickups)
            if (item.id == localId)
              item.copyWith(
                id: created.id,
                trackingCode: created.trackingCode,
                synced: true,
              )
            else
              item,
        ],
      );
      await _persist();
    } on core.CleanSavarApiException catch (e) {
      if (e.statusCode == 400 ||
          e.statusCode == 404 ||
          e.statusCode == 409 ||
          e.statusCode == 413 ||
          e.statusCode == 422) {
        state = state.copyWith(
          notifications: [e.message, ...state.notifications],
          hasUnreadNotifications: true,
        );
        await _persist();
        return;
      }
      await _queuePickupOffline(localId, request);
    } catch (_) {
      await _queuePickupOffline(localId, request);
    }
  }

  Future<void> _queuePickupOffline(String localId, PickupRequest request) async {
    final action = PendingSyncAction(
      id: 'pickup-$localId-${DateTime.now().millisecondsSinceEpoch}',
      type: 'pickup_create',
      createdAtIso: DateTime.now().toIso8601String(),
      payload: {
        'citizenName': state.citizenFullName,
        'citizenPhone': state.citizenPhone,
        'wardId': request.wardId,
        'addressLine': request.addressLine,
        'landmark': state.selectedWard.areaChipLabel,
        'wasteType': request.category.apiValue,
        'slot': request.slot.apiValue,
        'estimatedBags': request.estimatedBags,
        'lat': state.selectedWard.lat,
        'lng': state.selectedWard.lng,
        'scheduleType': request.scheduleType,
        if (request.preferredDay != null) 'preferredDay': request.preferredDay,
        'notes': request.notes,
      },
    );
    final queue = await _store.enqueue(action);
    state = state.copyWith(pendingSyncCount: queue.length);
  }

  String submitHotspotReport({
    required List<ReportIssueCategory> categories,
    required String note,
    required double lat,
    required double lng,
    required bool hasPhoto,
    String? photoMetaLabel,
    String? photoPath,
    Uint8List? photoBytes,
  }) {
    _sequenceCounter += 1;
    final code = 'CS-DR-${1050 + _sequenceCounter}';
    final localId = 'dr-$_sequenceCounter';
    final trimmedNote = note.trim();

    final report = HotspotReport(
      id: localId,
      trackingCode: code,
      wardId: state.selectedWard.id,
      wardLabel: state.selectedWard.fullNameBn,
      landmark: state.selectedWard.areaChipLabel,
      categories: List<ReportIssueCategory>.unmodifiable(categories),
      note: trimmedNote.isEmpty
          ? 'নাগরিক অ্যাপ থেকে ছবি ও লোকেশনসহ রিপোর্ট জমা দেওয়া হয়েছে।'
          : trimmedNote,
      lat: lat,
      lng: lng,
      status: HotspotStatus.reported,
      reportedAtLabel: 'এইমাত্র',
      hasPhoto: hasPhoto,
      photoMetaLabel: photoMetaLabel,
      photoPath: photoPath,
      synced: false,
    );

    state = state.copyWith(
      hotspots: [report, ...state.hotspots],
      ecoPoints: state.ecoPoints + 15,
      notifications: [
        'ময়লার রিপোর্ট $code সাভার পৌরসভা টিমে পাঠানো হয়েছে (+১৫ পয়েন্ট)।',
        ...state.notifications,
      ],
      hasUnreadNotifications: true,
    );

    unawaited(
      _persistAndSyncReport(
        localId: localId,
        report: report,
        photoBytes: photoBytes,
      ),
    );
    return code;
  }

  Future<void> _persistAndSyncReport({
    required String localId,
    required HotspotReport report,
    Uint8List? photoBytes,
  }) async {
    await _persist();
    try {
      final photoUrls = <String>[];
      var bytesToUpload = photoBytes;
      if (bytesToUpload == null &&
          report.photoPath != null &&
          report.photoPath!.isNotEmpty) {
        bytesToUpload = await readLocalFileBytes(report.photoPath!);
      }
      if (bytesToUpload != null && bytesToUpload.isNotEmpty) {
        final uploadedUrl = await _api.uploadPhotoBytes(bytesToUpload);
        photoUrls.add(uploadedUrl);
      }

      final created = await _api.submitDumpReport(
        reporterName: state.citizenFullName,
        reporterPhone: state.citizenPhone,
        wardId: report.wardId,
        titleBn: report.primaryTitleBn,
        landmark: '${report.landmark} — ${report.note}',
        severity: report.categories.contains(ReportIssueCategory.drainBlocked)
            ? core.ReportSeverity.high
            : core.ReportSeverity.medium,
        lat: report.lat,
        lng: report.lng,
        photoUrls: photoUrls,
      );

      state = state.copyWith(
        hotspots: [
          for (final item in state.hotspots)
            if (item.id == localId)
              item.copyWith(
                id: created.id,
                trackingCode: created.trackingCode,
                photoUrls: created.photoUrls,
                synced: true,
              )
            else
              item,
        ],
      );
      await _persist();
    } on core.CleanSavarApiException catch (e) {
      if (e.statusCode == 400 ||
          e.statusCode == 404 ||
          e.statusCode == 409 ||
          e.statusCode == 413 ||
          e.statusCode == 422) {
        state = state.copyWith(
          notifications: [e.message, ...state.notifications],
          hasUnreadNotifications: true,
        );
        await _persist();
        return;
      }
      await _queueReportOffline(localId, report, photoBytes: photoBytes);
    } catch (_) {
      await _queueReportOffline(localId, report, photoBytes: photoBytes);
    }
  }

  Future<void> _queueReportOffline(
    String localId,
    HotspotReport report, {
    Uint8List? photoBytes,
  }) async {
    final severity = report.categories.contains(ReportIssueCategory.drainBlocked)
        ? 'high'
        : 'medium';
    final action = PendingSyncAction(
      id: 'report-$localId-${DateTime.now().millisecondsSinceEpoch}',
      type: 'report_create',
      createdAtIso: DateTime.now().toIso8601String(),
      payload: {
        'reporterPhone': state.citizenPhone,
        'wardId': report.wardId,
        'titleBn': report.primaryTitleBn,
        'landmark': '${report.landmark} — ${report.note}',
        'severity': severity,
        'lat': report.lat,
        'lng': report.lng,
        'photoPath': report.photoPath,
        if (photoBytes != null &&
            photoBytes.isNotEmpty &&
            photoBytes.length <= core.CleanSavarApiClient.maxUploadBytes)
          'photoBase64': base64Encode(photoBytes),
      },
    );
    final queue = await _store.enqueue(action);
    state = state.copyWith(pendingSyncCount: queue.length);
  }
}

final citizenStateProvider =
    NotifierProvider<CitizenStateNotifier, CitizenState>(
  CitizenStateNotifier.new,
);
