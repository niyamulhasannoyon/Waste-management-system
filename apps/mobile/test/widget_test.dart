import 'package:clean_savar_core/clean_savar_core.dart' as core;
// ignore: deprecated_member_use
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:clean_savar_mobile/app.dart';
import 'package:clean_savar_mobile/core/services/device_services.dart';

class _TestCameraService implements DeviceCameraService {
  @override
  Future<CapturedPhoto?> captureCompressedPhoto({bool fromGallery = false}) async {
    return const CapturedPhoto(
      path: null,
      metaLabel: '১২৮০px • ২২০ KB JPEG',
      sizeBytes: 225280,
    );
  }
}

class _TestLocationService implements DeviceLocationService {
  @override
  Future<GeoFix?> getCurrentLocation() async => null;
}

class _OfflineTestApiClient extends core.CleanSavarApiClient {
  _OfflineTestApiClient() : super(baseUrl: 'http://127.0.0.1:0/api/v1');

  @override
  Future<List<core.SavarWard>> fetchWards() async => core.savarWardsSeed;

  @override
  Future<List<core.PickupRequestItem>> fetchPickups({
    int? wardId,
    String? status,
  }) async =>
      const [];

  @override
  Future<List<core.DumpReportItem>> fetchReports({
    int? wardId,
    String? status,
  }) async =>
      const [];

  @override
  Future<List<core.DumpReportItem>> fetchPublicHotspots({
    int? wardId,
    String? status,
  }) async =>
      const [];

  @override
  Future<core.OtpChallengeResult> requestOtp({
    required String phone,
    String role = 'citizen',
    String? fullName,
    int? wardId,
  }) async {
    return core.OtpChallengeResult(
      phone: phone,
      role: role,
      expiresInSeconds: 300,
      devOtpPreview: '123456',
    );
  }

  @override
  Future<core.OtpAuthResult> verifyOtp({
    required String phone,
    required String otp,
    String? nameBn,
    int? wardId,
  }) async {
    return core.OtpAuthResult(
      token: 'test-token',
      userId: '00000000-0000-0000-0000-000000000001',
      phone: phone,
      role: 'citizen',
    );
  }

  @override
  Future<core.PickupRequestItem> submitPickup({
    required String citizenName,
    required String citizenPhone,
    required int wardId,
    required String addressLine,
    required String landmark,
    required core.WasteType wasteType,
    required core.PickupSlot slot,
    required int estimatedBags,
    double? lat,
    double? lng,
    String scheduleType = 'one_time',
    String? preferredDay,
    String notes = '',
  }) async {
    throw const core.CleanSavarApiException(503, 'Offline test stub');
  }

  @override
  Future<core.DumpReportItem> submitDumpReport({
    required String reporterPhone,
    required int wardId,
    required String titleBn,
    required String landmark,
    required core.ReportSeverity severity,
    required double lat,
    required double lng,
    required List<String> photoUrls,
    String reporterName = 'নাগরিক অ্যাপ ব্যবহারকারী',
  }) async {
    throw const core.CleanSavarApiException(503, 'Offline test stub');
  }

  @override
  Future<void> pingVehicleLocation(String vehicleId, double lat, double lng) async {}

  @override
  Future<Map<String, dynamic>> completeCollectorTask({
    required String id,
    required double weightKg,
    required String idempotencyKey,
    bool qrVerified = false,
    String? completionPhotoUrl,
    String taskKind = 'pickup',
  }) async {
    return {'status': 'collected'};
  }
}

Widget _buildTestRoot({core.CleanSavarApiClient? apiClient}) {
  return ProviderScope(
    key: UniqueKey(),
    overrides: [
      apiClientProvider.overrideWithValue(apiClient ?? _OfflineTestApiClient()),
      deviceCameraServiceProvider.overrideWithValue(_TestCameraService()),
      deviceLocationServiceProvider.overrideWithValue(_TestLocationService()),
      qrCameraScannerEnabledProvider.overrideWithValue(false),
    ],
    child: const CleanSavarApp(),
  );
}

class _CollectorSyncTestApiClient extends _OfflineTestApiClient {
  @override
  Future<core.OtpAuthResult> verifyOtp({
    required String phone,
    required String otp,
    String? nameBn,
    int? wardId,
  }) async {
    setAuthToken('collector-token');
    return core.OtpAuthResult(
      token: 'collector-token',
      userId: '00000000-0000-0000-0000-000000000002',
      phone: phone,
      role: 'collector',
    );
  }

  @override
  Future<List<core.CollectorVehicleItem>> fetchVehicles({
    int? wardId,
    String? status,
  }) async {
    return const [
      core.CollectorVehicleItem(
        id: 'veh-01',
        code: 'SV-VAN-01',
        driverNameBn: 'মোঃ করিম মিয়া',
        driverPhone: '01712-448910',
        wardId: 3,
        vehicleType: 'rickshaw_van',
        status: 'on_duty',
        currentLat: 23.8492,
        currentLng: 90.2546,
        capacityKg: 500,
      ),
    ];
  }

  @override
  Future<List<core.PickupRequestItem>> fetchPickups({
    int? wardId,
    String? status,
  }) async {
    return const [
      core.PickupRequestItem(
        id: '11111111-1111-1111-1111-111111111111',
        trackingCode: 'CS-PK-9001',
        citizenName: 'নাজমা বেগম',
        citizenPhone: '01711-000001',
        wardId: 3,
        wardNameBn: 'ওয়ার্ড ০৩ — থানা রোড ও বাজার রোড',
        addressLine: 'থানা রোড, সাভার',
        wasteType: 'household',
        slot: 'morning',
        estimatedBags: 2,
        status: 'assigned',
        lat: 23.8492,
        lng: 90.2546,
      ),
    ];
  }

  @override
  Future<List<core.DumpReportItem>> fetchReports({
    int? wardId,
    String? status,
  }) async {
    return const [
      core.DumpReportItem(
        id: '22222222-2222-2222-2222-222222222222',
        trackingCode: 'CS-DR-9002',
        reporterPhone: '01711-000002',
        wardId: 3,
        wardNameBn: 'ওয়ার্ড ০৩ — থানা রোড ও বাজার রোড',
        titleBn: 'ড্রেন জ্যাম',
        landmark: 'বাজার রোড মোড়',
        severity: 'high',
        status: 'dispatched',
        lat: 23.8492,
        lng: 90.2546,
      ),
    ];
  }
}

Future<void> _pumpDemoCitizenApp(
  WidgetTester tester, {
  core.CleanSavarApiClient? apiClient,
}) async {
  await tester.pumpWidget(_buildTestRoot(apiClient: apiClient));
  await tester.pumpAndSettle();
  await tester.ensureVisible(find.byKey(const ValueKey('demo_citizen_btn')));
  await tester.tap(find.byKey(const ValueKey('demo_citizen_btn')));
  await tester.pumpAndSettle();
}

void main() {
  setUpAll(() {
    GoogleFonts.config.allowRuntimeFetching = false;
  });

  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  testWidgets('Citizen home displays required Savar sections and nav tabs', (
    tester,
  ) async {
    await _pumpDemoCitizenApp(tester);

    expect(find.text('শুভ সকাল, রাফি'), findsOneWidget);
    expect(find.text('ব্যাংক টাউন, সাভার - ওয়ার্ড ৫'), findsOneWidget);
    expect(
      find.text('পরবর্তী ময়লা সংগ্রহ: আগামীকাল সকাল ৯:০০ - ১০:০০'),
      findsOneWidget,
    );
    expect(find.text('বাসার ময়লা দিন'), findsOneWidget);
    expect(find.text('রাস্তার ময়লা রিপোর্ট করুন'), findsOneWidget);

    expect(find.text('হোম'), findsOneWidget);
    expect(find.text('রিকোয়েস্ট'), findsOneWidget);
    expect(find.text('ম্যাপ'), findsOneWidget);
    expect(find.text('প্রোফাইল'), findsOneWidget);

    await tester.scrollUntilVisible(
      find.text('১২০ পয়েন্ট'),
      180,
      scrollable: find.byType(Scrollable).first,
    );
    expect(find.text('১২০ পয়েন্ট'), findsOneWidget);
    expect(find.text('পচনশীল'), findsOneWidget);
    expect(find.text('সবুজ বিন'), findsOneWidget);
    expect(find.text('রিসাইকেলযোগ্য'), findsOneWidget);
    expect(find.text('নীল বিন'), findsOneWidget);
  });

  testWidgets('Report Garbage bottom sheet opens and submits report', (
    tester,
  ) async {
    await _pumpDemoCitizenApp(tester);

    await tester.tap(find.text('রাস্তার ময়লা রিপোর্ট করুন'));
    await tester.pumpAndSettle();

    expect(find.text('এক ট্যাপে ছবি তুলুন (ক্যামেরা)'), findsOneWidget);
    expect(find.text('রাস্তার পাশে ময়লা'), findsOneWidget);
    expect(find.text('ড্রেন জ্যাম'), findsOneWidget);
    expect(find.text('ডাস্টবিন উপচে পড়ছে'), findsOneWidget);
    expect(find.text('দুর্গন্ধ'), findsOneWidget);

    await tester.tap(find.text('এক ট্যাপে ছবি তুলুন (ক্যামেরা)'));
    await tester.pump();
    expect(find.text('ছবি সংযুক্ত হয়েছে ✓'), findsOneWidget);

    await tester.ensureVisible(find.text('ড্রেন জ্যাম'));
    await tester.tap(find.text('ড্রেন জ্যাম'));
    await tester.pump();

    await tester.ensureVisible(find.text('রিপোর্ট জমা দিন'));
    await tester.tap(find.text('রিপোর্ট জমা দিন'));
    await tester.pumpAndSettle();

    await tester.scrollUntilVisible(
      find.text('১৩৫ পয়েন্ট'),
      180,
      scrollable: find.byType(Scrollable).first,
    );
    expect(find.text('১৩৫ পয়েন্ট'), findsOneWidget);
  });

  testWidgets('Role switcher toggles to Collector Mode with high-contrast UI', (
    tester,
  ) async {
    await _pumpDemoCitizenApp(tester);

    await tester.tap(find.text('কর্মী অ্যাপ'));
    await tester.pumpAndSettle();

    expect(find.text('পরিচ্ছন্নতাকর্মী অ্যাপ'), findsOneWidget);
    expect(find.text('কাজ শুরু করুন'), findsOneWidget);
    expect(find.text('সব তথ্য সিঙ্ক সম্পন্ন'), findsOneWidget);

    await tester.tap(find.text('কাজ শুরু করুন'));
    await tester.pump();
    expect(find.text('অনলাইন • ডিউটি চালু আছে'), findsOneWidget);

    await tester.tap(find.text('নেট: অনলাইন'));
    await tester.pump();
    expect(find.text('নেট: অফলাইন'), findsOneWidget);

    await tester.scrollUntilVisible(
      find.text('বাসা ১৪'),
      200,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.pumpAndSettle();
    expect(find.text('QR স্ক্যান করুন'), findsWidgets);
    expect(find.text('সংগ্রহ সম্পন্ন'), findsWidgets);

    // Completing without entering or choosing weight prompts explicit validation
    await tester.ensureVisible(find.text('সংগ্রহ সম্পন্ন').first);
    await tester.pumpAndSettle();
    await tester.tap(find.text('সংগ্রহ সম্পন্ন').first);
    await tester.pump();
    expect(
      find.text('অনুগ্রহ করে আনুমানিক ওজন (কেজি) লিখুন বা দ্রুত ওজন বাটন চাপুন।'),
      findsOneWidget,
    );

    // Choose quick weight chip (৫ কেজি) and mark stop completed while offline
    await tester.ensureVisible(find.text('৫ কেজি').first);
    await tester.pumpAndSettle();
    await tester.tap(find.text('৫ কেজি').first);
    await tester.pump();

    await tester.ensureVisible(find.text('সংগ্রহ সম্পন্ন').first);
    await tester.pumpAndSettle();
    await tester.tap(find.text('সংগ্রহ সম্পন্ন').first);
    await tester.pumpAndSettle();

    // Completing the tall stop shrinks the card above the scroll offset; scroll back up cleanly.
    await tester.scrollUntilVisible(
      find.text('বাসা ১৪'),
      -200,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.ensureVisible(find.text('বাসা ১৪'));
    await tester.pumpAndSettle();
    expect(find.textContaining('সংগ্রহ সম্পন্ন • ৫ কেজি'), findsWidgets);

    await tester.scrollUntilVisible(
      find.text('নেট: অফলাইন'),
      -200,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.ensureVisible(find.text('নেট: অফলাইন'));
    await tester.pumpAndSettle();
    expect(find.text('১টি তথ্য আপলোডের অপেক্ষায়'), findsOneWidget);

    // Restoring connectivity flushes the queued action cleanly
    await tester.tap(find.text('নেট: অফলাইন'));
    await tester.pumpAndSettle();
    expect(find.text('সব তথ্য সিঙ্ক সম্পন্ন'), findsOneWidget);
  });

  testWidgets('Collector QR scan sheet requires matching bin tag without platform camera in tests', (
    tester,
  ) async {
    await _pumpDemoCitizenApp(tester);

    await tester.tap(find.text('কর্মী অ্যাপ'));
    await tester.pumpAndSettle();

    await tester.scrollUntilVisible(
      find.text('QR স্ক্যান করুন').first,
      200,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.ensureVisible(find.text('QR স্ক্যান করুন').first);
    await tester.pumpAndSettle();
    await tester.tap(find.text('QR স্ক্যান করুন').first);
    await tester.pumpAndSettle();

    expect(find.text('বাসার QR কোড স্ক্যান করুন'), findsOneWidget);
    expect(find.text('ট্যাগ কোড: SV-W05-H14'), findsOneWidget);

    // Submitting without matching tag keeps sheet open with validation message
    await tester.tap(find.text('QR যাচাই সম্পন্ন করুন'));
    await tester.pump();
    expect(find.textContaining('যাচাই করতে বিনের গায়ে থাকা ট্যাগ কোড'), findsOneWidget);

    await tester.enterText(
      find.byKey(const ValueKey('manual_qr_tag_input')),
      'SV-W05-H14',
    );
    await tester.pump();
    await tester.tap(find.text('QR যাচাই সম্পন্ন করুন'));
    await tester.pumpAndSettle();

    expect(find.textContaining('যাচাই হয়েছে'), findsWidgets);
  });

  testWidgets('Request Pickup bottom sheet supports recurring weekly schedule and submits', (
    tester,
  ) async {
    await _pumpDemoCitizenApp(tester);

    await tester.tap(find.text('বাসার ময়লা দিন'));
    await tester.pumpAndSettle();

    expect(find.text('সময়সূচির ধরন'), findsOneWidget);
    await tester.tap(find.text('প্রতি সপ্তাহে'));
    await tester.pump();
    expect(find.text('পছন্দের সাপ্তাহিক দিন'), findsOneWidget);

    await tester.ensureVisible(find.text('পিকআপ রিকোয়েস্ট পাঠান'));
    await tester.tap(find.text('পিকআপ রিকোয়েস্ট পাঠান'));
    await tester.pumpAndSettle();

    expect(find.textContaining('পিকআপ বুকিং সফল'), findsOneWidget);
  });

  testWidgets('Citizen Profile executes OTP challenge and verifies session', (
    tester,
  ) async {
    await _pumpDemoCitizenApp(tester);

    await tester.tap(find.text('প্রোফাইল'));
    await tester.pumpAndSettle();

    await tester.scrollUntilVisible(
      find.text('OTP পাঠান'),
      200,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.ensureVisible(find.text('OTP পাঠান'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('OTP পাঠান'));
    await tester.pumpAndSettle();

    expect(find.text('যাচাই করুন'), findsOneWidget);
    await tester.enterText(find.byType(TextField).last, '123456');
    await tester.pump();
    await tester.tap(find.text('যাচাই করুন'));
    await tester.pumpAndSettle();

    expect(find.text('নাগরিক অ্যাকাউন্ট যাচাইকৃত'), findsOneWidget);
  });

  testWidgets('Auth screen supports Citizen OTP login and logout', (
    tester,
  ) async {
    await tester.pumpWidget(_buildTestRoot());
    await tester.pumpAndSettle();

    expect(find.text('নাগরিক লগইন'), findsOneWidget);
    expect(find.text('কর্মী লগইন'), findsOneWidget);
    expect(find.text('নাগরিক মোবাইল OTP লগইন'), findsOneWidget);

    await tester.ensureVisible(find.byKey(const ValueKey('login_send_otp_btn')));
    await tester.tap(find.byKey(const ValueKey('login_send_otp_btn')));
    await tester.pumpAndSettle();

    expect(find.byKey(const ValueKey('login_otp_input')), findsOneWidget);
    await tester.ensureVisible(find.byKey(const ValueKey('login_verify_otp_btn')));
    await tester.tap(find.byKey(const ValueKey('login_verify_otp_btn')));
    await tester.pumpAndSettle();

    expect(find.text('শুভ সকাল, রাফি'), findsOneWidget);

    await tester.tap(find.text('প্রোফাইল'));
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(
      find.text('লগআউট'),
      200,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.ensureVisible(find.text('লগআউট'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('লগআউট'));
    await tester.pumpAndSettle();

    expect(find.text('নাগরিক লগইন'), findsOneWidget);
    expect(find.text('কর্মী লগইন'), findsOneWidget);
  });

  testWidgets('Auth screen rejects non-collector phone on Collector tab and accepts collector OTP', (
    tester,
  ) async {
    // 1. Non-collector phone on Collector tab gets clear Bangla rejection
    await tester.pumpWidget(_buildTestRoot());
    await tester.pumpAndSettle();

    await tester.ensureVisible(find.byKey(const ValueKey('login_tab_collector')));
    await tester.tap(find.byKey(const ValueKey('login_tab_collector')));
    await tester.pumpAndSettle();
    expect(find.text('পরিচ্ছন্নতাকর্মী OTP লগইন'), findsOneWidget);

    await tester.ensureVisible(find.byKey(const ValueKey('login_send_otp_btn')));
    await tester.tap(find.byKey(const ValueKey('login_send_otp_btn')));
    await tester.pumpAndSettle();

    await tester.ensureVisible(find.byKey(const ValueKey('login_verify_otp_btn')));
    await tester.tap(find.byKey(const ValueKey('login_verify_otp_btn')));
    await tester.pumpAndSettle();

    expect(
      find.textContaining('এই নম্বরটি পৌরসভার নিবন্ধিত পরিচ্ছন্নতাকর্মী হিসেবে যুক্ত নয়'),
      findsOneWidget,
    );

    // 2. Registered collector phone authenticates and loads live vehicle + tasks
    await tester.pumpWidget(_buildTestRoot(apiClient: _CollectorSyncTestApiClient()));
    await tester.pumpAndSettle();

    await tester.ensureVisible(find.byKey(const ValueKey('login_tab_collector')));
    await tester.tap(find.byKey(const ValueKey('login_tab_collector')));
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.byKey(const ValueKey('login_send_otp_btn')));
    await tester.tap(find.byKey(const ValueKey('login_send_otp_btn')));
    await tester.pumpAndSettle();

    await tester.ensureVisible(find.byKey(const ValueKey('login_verify_otp_btn')));
    await tester.tap(find.byKey(const ValueKey('login_verify_otp_btn')));
    await tester.pumpAndSettle();

    expect(find.text('পরিচ্ছন্নতাকর্মী অ্যাপ'), findsOneWidget);
    expect(find.text('মোঃ করিম মিয়া • SV-VAN-01'), findsOneWidget);

    await tester.scrollUntilVisible(
      find.text('CS-PK-9001'),
      200,
      scrollable: find.byType(Scrollable).first,
    );
    expect(find.text('CS-PK-9001'), findsOneWidget);

    await tester.scrollUntilVisible(
      find.text('CS-DR-9002'),
      200,
      scrollable: find.byType(Scrollable).first,
    );
    expect(find.text('CS-DR-9002'), findsOneWidget);

    await tester.scrollUntilVisible(
      find.byKey(const ValueKey('collector_logout_btn')),
      -200,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.ensureVisible(find.byKey(const ValueKey('collector_logout_btn')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('collector_logout_btn')));
    await tester.pumpAndSettle();
    expect(find.text('কর্মী লগইন'), findsOneWidget);
  });

  testWidgets('Offline demo buttons open Citizen & Collector demo modes cleanly', (
    tester,
  ) async {
    await tester.pumpWidget(_buildTestRoot());
    await tester.pumpAndSettle();

    expect(
      find.text('অফলাইন ডেমো মোড (সার্ভার ছাড়াই প্রিভিউ)'),
      findsOneWidget,
    );

    await tester.ensureVisible(find.byKey(const ValueKey('demo_collector_btn')));
    await tester.tap(find.byKey(const ValueKey('demo_collector_btn')));
    await tester.pumpAndSettle();

    expect(find.text('পরিচ্ছন্নতাকর্মী অ্যাপ'), findsOneWidget);
    expect(find.text('মোঃ আলমগীর (ডেমো) • SV-VAN-04'), findsOneWidget);
    expect(find.text('ডেমো প্রিভিউ • মোড পরিবর্তন করুন'), findsOneWidget);

    await tester.tap(find.text('নাগরিক অ্যাপ'));
    await tester.pumpAndSettle();
    expect(find.text('শুভ সকাল, রাফি'), findsOneWidget);
  });
}
