import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../constants/savar_seed_data.dart';
import '../models/hotspot_report.dart';
import '../models/pickup_request.dart';
import '../models/ward_info.dart';

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

  CitizenState copyWith({
    WardInfo? selectedWard,
    int? ecoPoints,
    List<PickupRequest>? pickups,
    List<HotspotReport>? hotspots,
    List<String>? notifications,
    bool? hasUnreadNotifications,
    int? activeTabIndex,
  }) {
    return CitizenState(
      citizenName: citizenName,
      citizenFullName: citizenFullName,
      citizenPhone: citizenPhone,
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
    );
  }
}

class CitizenStateNotifier extends Notifier<CitizenState> {
  int _sequenceCounter = 45;

  @override
  CitizenState build() {
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

  void setTab(int index) {
    if (state.activeTabIndex != index) {
      state = state.copyWith(activeTabIndex: index);
    }
  }

  void selectWard(WardInfo ward) {
    state = state.copyWith(selectedWard: ward);
  }

  void markNotificationsRead() {
    if (state.hasUnreadNotifications) {
      state = state.copyWith(hasUnreadNotifications: false);
    }
  }

  String submitPickupRequest({
    required String addressLine,
    required WasteCategory category,
    required PickupSlot slot,
    required int estimatedBags,
    String notes = '',
  }) {
    _sequenceCounter += 1;
    final code = 'CS-PK-${2000 + _sequenceCounter}';
    final bonusPoints =
        (category == WasteCategory.organic || category == WasteCategory.recyclable)
            ? 20
            : 10;

    final newRequest = PickupRequest(
      id: 'pk-$_sequenceCounter',
      trackingCode: code,
      addressLine: addressLine.trim().isEmpty
          ? state.defaultAddress
          : addressLine.trim(),
      wardLabel: state.selectedWard.fullNameBn,
      category: category,
      slot: slot,
      estimatedBags: estimatedBags,
      status: PickupStatus.pending,
      createdAtLabel: 'এইমাত্র',
      assignedCollectorName: state.nextCollectorName,
      assignedVehicleCode: state.nextCollectorVehicle,
      notes: notes.trim(),
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
    return code;
  }

  String submitHotspotReport({
    required List<ReportIssueCategory> categories,
    required String note,
    required double lat,
    required double lng,
    required bool hasPhoto,
    String? photoMetaLabel,
  }) {
    _sequenceCounter += 1;
    final code = 'CS-DR-${1050 + _sequenceCounter}';
    final trimmedNote = note.trim();

    final report = HotspotReport(
      id: 'dr-$_sequenceCounter',
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
    return code;
  }
}

final citizenStateProvider =
    NotifierProvider<CitizenStateNotifier, CitizenState>(
  CitizenStateNotifier.new,
);
