import 'package:clean_savar_core/clean_savar_core.dart' as core;
import 'package:clean_savar_mobile/app.dart';
import 'package:clean_savar_mobile/core/models/app_role.dart';
import 'package:clean_savar_mobile/core/providers/citizen_state_provider.dart';
import 'package:clean_savar_mobile/core/services/device_services.dart';
// ignore: deprecated_member_use
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shared_preferences/shared_preferences.dart';

class _MockFirebaseApiClient extends core.CleanSavarApiClient {
  _MockFirebaseApiClient() : super(baseUrl: 'http://127.0.0.1:0/api/v1');

  bool firebaseTokenEndpointCalled = false;
  String? lastIdTokenReceived;
  String? lastExpectedRole;

  @override
  Future<List<core.SavarWard>> fetchWards() async => core.savarWardsSeed;

  @override
  Future<core.OtpAuthResult> loginWithFirebaseToken({
    required String idToken,
    String? fullName,
    int? wardId,
    String? role,
  }) async {
    firebaseTokenEndpointCalled = true;
    lastIdTokenReceived = idToken;
    lastExpectedRole = role;

    if (idToken == 'invalid_token') {
      throw const core.CleanSavarApiException(
        401,
        'Invalid or expired Firebase token.',
      );
    }

    if (role == 'collector' && idToken.contains('non_collector')) {
      return const core.OtpAuthResult(
        token: 'citizen_jwt_token',
        userId: 'cit-uuid-1',
        phone: '01715883210',
        role: 'citizen',
        nameBn: 'রাফি আহমেদ',
      );
    }

    final isCollector = role == 'collector';
    return core.OtpAuthResult(
      token: isCollector ? 'collector_jwt_token' : 'citizen_jwt_token',
      userId: isCollector ? 'col-uuid-1' : 'cit-uuid-1',
      phone: isCollector ? '01712448910' : '01715883210',
      role: isCollector ? 'collector' : 'citizen',
      nameBn: isCollector ? 'মোঃ করিম মিয়া' : 'রাফি আহমেদ',
    );
  }

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
    final isCollector = phone.contains('448910');
    return core.OtpAuthResult(
      token: 'verified_token',
      userId: 'test-user',
      phone: phone,
      role: isCollector ? 'collector' : 'citizen',
      nameBn: nameBn ?? (isCollector ? 'মোঃ করিম মিয়া' : 'রাফি আহমেদ'),
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
}

class _DummyCameraService implements DeviceCameraService {
  @override
  Future<CapturedPhoto?> captureCompressedPhoto({bool fromGallery = false}) async => null;
}

class _DummyLocationService implements DeviceLocationService {
  @override
  Future<GeoFix?> getCurrentLocation() async => null;
}

void main() {
  setUpAll(() {
    GoogleFonts.config.allowRuntimeFetching = false;
  });

  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  group('Phone Auth & Firebase Integration Flow Tests', () {
    test('CitizenStateNotifier exchanges valid Firebase token for citizen session', () async {
      final mockApi = _MockFirebaseApiClient();
      final element = ProviderContainer(
        overrides: [
          apiClientProvider.overrideWithValue(mockApi),
        ],
      );

      final notifier = element.read(citizenStateProvider.notifier);
      final result = await notifier.loginWithFirebaseToken(
        idToken: 'valid_citizen_firebase_id_token',
        phone: '01715-883210',
        expectedRole: AppRole.citizen,
        fullName: 'রাফি আহমেদ',
      );

      expect(mockApi.firebaseTokenEndpointCalled, isTrue);
      expect(mockApi.lastIdTokenReceived, 'valid_citizen_firebase_id_token');
      expect(result.token, 'citizen_jwt_token');
      expect(result.role, 'citizen');

      final state = element.read(citizenStateProvider);
      expect(state.isAuthenticated, isTrue);
      expect(state.authenticatedRole, 'citizen');
      expect(state.citizenFullName, 'রাফি আহমেদ');
    });

    test('Collector login rejects non-collector role with 403 exception', () async {
      final mockApi = _MockFirebaseApiClient();
      final container = ProviderContainer(
        overrides: [
          apiClientProvider.overrideWithValue(mockApi),
        ],
      );

      final notifier = container.read(citizenStateProvider.notifier);

      expect(
        () async => await notifier.loginWithFirebaseToken(
          idToken: 'non_collector_firebase_token',
          phone: '01715-883210',
          expectedRole: AppRole.collector,
        ),
        throwsA(
          isA<core.CleanSavarApiException>().having(
            (e) => e.statusCode,
            'statusCode',
            403,
          ),
        ),
      );
    });

    test('Collector login succeeds for authorized collector Firebase token', () async {
      final mockApi = _MockFirebaseApiClient();
      final container = ProviderContainer(
        overrides: [
          apiClientProvider.overrideWithValue(mockApi),
        ],
      );

      final notifier = container.read(citizenStateProvider.notifier);
      final result = await notifier.loginWithFirebaseToken(
        idToken: 'valid_collector_token',
        phone: '01712-448910',
        expectedRole: AppRole.collector,
        fullName: 'মোঃ করিম মিয়া',
      );

      expect(result.token, 'collector_jwt_token');
      expect(result.role, 'collector');

      final state = container.read(citizenStateProvider);
      expect(state.isAuthenticated, isTrue);
      expect(state.authenticatedRole, 'collector');
    });

    test('Firebase token exchange fails gracefully on 401 invalid token', () async {
      final mockApi = _MockFirebaseApiClient();
      final container = ProviderContainer(
        overrides: [
          apiClientProvider.overrideWithValue(mockApi),
        ],
      );

      final notifier = container.read(citizenStateProvider.notifier);

      expect(
        () async => await notifier.loginWithFirebaseToken(
          idToken: 'invalid_token',
          phone: '01715-883210',
          expectedRole: AppRole.citizen,
        ),
        throwsA(
          isA<core.CleanSavarApiException>().having(
            (e) => e.statusCode,
            'statusCode',
            401,
          ),
        ),
      );
    });

    testWidgets('UI handles Firebase phone auth fallback to direct API challenge seamlessly', (tester) async {
      final mockApi = _MockFirebaseApiClient();
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            apiClientProvider.overrideWithValue(mockApi),
            deviceCameraServiceProvider.overrideWithValue(_DummyCameraService()),
            deviceLocationServiceProvider.overrideWithValue(_DummyLocationService()),
            qrCameraScannerEnabledProvider.overrideWithValue(false),
          ],
          child: const CleanSavarApp(),
        ),
      );
      await tester.pumpAndSettle();

      // Ensure we are on login screen
      expect(find.text('নাগরিক মোবাইল OTP লগইন'), findsOneWidget);

      // Tap Send OTP (Firebase verifyPhoneNumber triggers fallback to API challenge in unit test environment)
      await tester.ensureVisible(find.byKey(const ValueKey('login_send_otp_btn')));
      await tester.tap(find.byKey(const ValueKey('login_send_otp_btn')));
      await tester.pumpAndSettle();

      // Verify OTP field is displayed
      expect(find.byKey(const ValueKey('login_otp_input')), findsOneWidget);

      // Verify OTP
      await tester.ensureVisible(find.byKey(const ValueKey('login_verify_otp_btn')));
      await tester.tap(find.byKey(const ValueKey('login_verify_otp_btn')));
      await tester.pumpAndSettle();

      // Should be navigated to citizen home screen
      expect(find.textContaining('রাফি'), findsWidgets);
    });
  });
}
