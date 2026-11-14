import 'dart:convert';
import 'dart:typed_data';

import 'package:http/http.dart' as http;

import '../data/savar_wards_seed.dart';
import '../models/savar_models.dart';

class CleanSavarApiException implements Exception {
  const CleanSavarApiException(this.statusCode, this.message);

  final int statusCode;
  final String message;

  @override
  String toString() => 'CleanSavarApiException($statusCode): $message';
}

class CleanSavarApiClient {
  CleanSavarApiClient({
    String? baseUrl,
    http.Client? httpClient,
    String? authToken,
  })  : baseUrl = (baseUrl ??
                const String.fromEnvironment(
                  'API_BASE_URL',
                  defaultValue: bool.fromEnvironment('dart.vm.product')
                      ? 'https://clean-savar-api.onrender.com/api/v1'
                      : 'http://10.0.2.2:8080/api/v1',
                ))
            .replaceAll(RegExp(r'/$'), ''),
        _client = httpClient ?? http.Client(),
        _authToken = authToken;

  final String baseUrl;
  final http.Client _client;
  String? _authToken;
  static const Duration _timeout = Duration(seconds: 15);
  static const Duration _uploadTimeout = Duration(seconds: 30);
  static const int maxUploadBytes = 5 * 1024 * 1024;

  String? get authToken => _authToken;

  void setAuthToken(String? token) {
    _authToken = (token == null || token.trim().isEmpty) ? null : token.trim();
  }

  Map<String, String> _headers({String? idempotencyKey}) {
    return {
      'Content-Type': 'application/json',
      if (_authToken != null) 'Authorization': 'Bearer $_authToken',
      if (idempotencyKey != null) 'Idempotency-Key': idempotencyKey,
    };
  }

  String _extractErrorMessage(
    String body,
    int statusCode, {
    String? fallbackMessage,
  }) {
    try {
      final decoded = jsonDecode(body);
      if (decoded is Map<String, dynamic>) {
        final err = decoded['error'];
        if (err is Map<String, dynamic>) {
          final bn = err['message_bn'] as String?;
          if (bn != null && bn.trim().isNotEmpty) return bn;
          final msg = err['message'] as String?;
          if (msg != null && msg.trim().isNotEmpty) return msg;
        }
        if (err is String && err.trim().isNotEmpty) {
          return err;
        }
      }
    } catch (_) {}
    return fallbackMessage ?? 'সার্ভার ত্রুটি ($statusCode)';
  }

  Future<List<SavarWard>> fetchWards() async {
    try {
      final res = await _client.get(Uri.parse('$baseUrl/wards')).timeout(_timeout);
      if (res.statusCode == 200) {
        final raw = jsonDecode(res.body) as List<dynamic>;
        return raw.map((e) => SavarWard.fromJson(e as Map<String, dynamic>)).toList();
      }
    } catch (_) {
      // Fallback to bundled Savar ward table for instant low-end cold start.
    }
    return savarWardsSeed;
  }

  Future<SavarWard> resolveWardByCoords(double lat, double lng) async {
    try {
      final res = await _client
          .get(Uri.parse('$baseUrl/wards/resolve?lat=$lat&lng=$lng'))
          .timeout(_timeout);
      if (res.statusCode == 200) {
        final json = jsonDecode(res.body) as Map<String, dynamic>;
        final id = (json['ward_id'] as num).toInt();
        return savarWardsSeed.firstWhere((w) => w.id == id, orElse: () => savarWardsSeed.first);
      }
    } catch (_) {}
    return resolveNearestWardOffline(lat, lng);
  }

  Future<PickupRequestItem> submitPickup({
    required String citizenName,
    required String citizenPhone,
    required int wardId,
    required String addressLine,
    required String landmark,
    required WasteType wasteType,
    required PickupSlot slot,
    required int estimatedBags,
    double? lat,
    double? lng,
    String scheduleType = 'one_time',
    String? preferredDay,
    String notes = '',
  }) async {
    final normalizedSchedule =
        scheduleType == 'recurring_weekly' ? 'recurring_weekly' : 'one_time';
    final res = await _client
        .post(
          Uri.parse('$baseUrl/pickups'),
          headers: _headers(),
          body: jsonEncode({
            'citizen_name': citizenName,
            'citizen_phone': citizenPhone,
            'ward_id': wardId,
            'address_line': addressLine,
            'landmark': landmark,
            'waste_type': wasteType.apiValue,
            'slot': slot.apiValue,
            'schedule_type': normalizedSchedule,
            if (normalizedSchedule == 'recurring_weekly' && preferredDay != null)
              'preferred_day': preferredDay,
            'estimated_bags': estimatedBags,
            'lat': lat,
            'lng': lng,
            if (notes.trim().isNotEmpty) 'notes': notes.trim(),
          }),
        )
        .timeout(_timeout);

    if (res.statusCode == 201) {
      return PickupRequestItem.fromJson(jsonDecode(res.body) as Map<String, dynamic>);
    }
    throw CleanSavarApiException(
      res.statusCode,
      _extractErrorMessage(res.body, res.statusCode),
    );
  }

  Future<String> uploadPhotoBytes(
    Uint8List bytes, {
    String filename = 'photo.jpg',
  }) async {
    if (bytes.length > maxUploadBytes) {
      throw const CleanSavarApiException(
        413,
        'ছবির আকার সর্বোচ্চ ৫ মেগাবাইট হতে পারবে।',
      );
    }
    final req = http.MultipartRequest('POST', Uri.parse('$baseUrl/uploads/photo'))
      ..files.add(
        http.MultipartFile.fromBytes('photo', bytes, filename: filename),
      );
    if (_authToken != null) {
      req.headers['Authorization'] = 'Bearer $_authToken';
    }
    final streamed = await req.send().timeout(_uploadTimeout);
    final body = await streamed.stream.bytesToString();
    if (streamed.statusCode == 201) {
      final json = jsonDecode(body) as Map<String, dynamic>;
      return json['url'] as String;
    }
    throw CleanSavarApiException(
      streamed.statusCode,
      _extractErrorMessage(
        body,
        streamed.statusCode,
        fallbackMessage: 'ছবি আপলোড করা যায়নি (${streamed.statusCode})',
      ),
    );
  }

  Future<DumpReportItem> submitDumpReport({
    required String reporterPhone,
    required int wardId,
    required String titleBn,
    required String landmark,
    required ReportSeverity severity,
    required double lat,
    required double lng,
    required List<String> photoUrls,
    String reporterName = 'নাগরিক অ্যাপ ব্যবহারকারী',
  }) async {
    final res = await _client
        .post(
          Uri.parse('$baseUrl/reports'),
          headers: _headers(),
          body: jsonEncode({
            'reporter_name': reporterName,
            'reporter_phone': reporterPhone,
            'ward_id': wardId,
            'title_bn': titleBn,
            'landmark': landmark,
            'severity': severity.apiValue,
            'lat': lat,
            'lng': lng,
            'photo_urls': photoUrls,
          }),
        )
        .timeout(_timeout);

    if (res.statusCode == 201) {
      final decoded = jsonDecode(res.body) as Map<String, dynamic>;
      final payload = (decoded['report'] is Map<String, dynamic>)
          ? decoded['report'] as Map<String, dynamic>
          : decoded;
      return DumpReportItem.fromJson(payload);
    }
    throw CleanSavarApiException(
      res.statusCode,
      _extractErrorMessage(res.body, res.statusCode),
    );
  }

  Future<List<PickupRequestItem>> fetchPickups({int? wardId, String? status}) async {
    final params = <String, String>{};
    if (wardId != null) params['ward_id'] = '$wardId';
    if (status != null) params['status'] = status;
    final uri = Uri.parse('$baseUrl/pickups').replace(queryParameters: params.isEmpty ? null : params);
    final res = await _client.get(uri, headers: _headers()).timeout(_timeout);
    if (res.statusCode == 200) {
      final raw = jsonDecode(res.body) as List<dynamic>;
      return raw.map((e) => PickupRequestItem.fromJson(e as Map<String, dynamic>)).toList();
    }
    throw CleanSavarApiException(
      res.statusCode,
      _extractErrorMessage(res.body, res.statusCode),
    );
  }

  Future<List<DumpReportItem>> fetchPublicHotspots({
    int? wardId,
    String? status,
  }) async {
    final params = <String, String>{};
    if (wardId != null) params['ward_id'] = '$wardId';
    if (status != null) params['status'] = status;
    final uri = Uri.parse('$baseUrl/reports/public')
        .replace(queryParameters: params.isEmpty ? null : params);
    final res = await _client.get(uri, headers: _headers()).timeout(_timeout);
    if (res.statusCode == 200) {
      final raw = jsonDecode(res.body) as List<dynamic>;
      return raw
          .map((e) => DumpReportItem.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    throw CleanSavarApiException(
      res.statusCode,
      _extractErrorMessage(res.body, res.statusCode),
    );
  }

  Future<List<DumpReportItem>> fetchReports({int? wardId, String? status}) async {
    final params = <String, String>{};
    if (wardId != null) params['ward_id'] = '$wardId';
    if (status != null) params['status'] = status;
    final uri = Uri.parse('$baseUrl/reports').replace(queryParameters: params.isEmpty ? null : params);
    final res = await _client.get(uri, headers: _headers()).timeout(_timeout);
    if (res.statusCode == 200) {
      final raw = jsonDecode(res.body) as List<dynamic>;
      return raw.map((e) => DumpReportItem.fromJson(e as Map<String, dynamic>)).toList();
    }
    throw CleanSavarApiException(
      res.statusCode,
      _extractErrorMessage(res.body, res.statusCode),
    );
  }

  Future<void> updatePickupStatus(String id, String status) async {
    final res = await _client
        .patch(
          Uri.parse('$baseUrl/pickups/$id/status'),
          headers: _headers(),
          body: jsonEncode({'status': status}),
        )
        .timeout(_timeout);
    if (res.statusCode != 200) {
      throw CleanSavarApiException(
        res.statusCode,
        _extractErrorMessage(res.body, res.statusCode),
      );
    }
  }

  Future<void> updateReportStatus(
    String id,
    String status, {
    String? resolvedPhotoUrl,
  }) async {
    final res = await _client
        .patch(
          Uri.parse('$baseUrl/reports/$id/status'),
          headers: _headers(),
          body: jsonEncode({
            'status': status,
            'resolved_photo_url': resolvedPhotoUrl,
          }),
        )
        .timeout(_timeout);
    if (res.statusCode != 200) {
      throw CleanSavarApiException(
        res.statusCode,
        _extractErrorMessage(res.body, res.statusCode),
      );
    }
  }

  Future<void> pingVehicleLocation(String vehicleId, double lat, double lng) async {
    await _client
        .patch(
          Uri.parse('$baseUrl/dispatch/vehicles/$vehicleId/location'),
          headers: _headers(),
          body: jsonEncode({'lat': lat, 'lng': lng}),
        )
        .timeout(_timeout);
  }

  Future<List<CollectorVehicleItem>> fetchVehicles({int? wardId, String? status}) async {
    final params = <String, String>{};
    if (wardId != null) params['ward_id'] = '$wardId';
    if (status != null) params['status'] = status;
    final uri = Uri.parse('$baseUrl/dispatch/vehicles')
        .replace(queryParameters: params.isEmpty ? null : params);
    final res = await _client.get(uri, headers: _headers()).timeout(_timeout);
    if (res.statusCode == 200) {
      final raw = jsonDecode(res.body) as List<dynamic>;
      return raw
          .map((e) => CollectorVehicleItem.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    throw CleanSavarApiException(
      res.statusCode,
      _extractErrorMessage(res.body, res.statusCode),
    );
  }

  Future<OtpChallengeResult> requestOtp({
    required String phone,
    String role = 'citizen',
    String? fullName,
    int? wardId,
  }) async {
    final res = await _client
        .post(
          Uri.parse('$baseUrl/auth/otp-login'),
          headers: _headers(),
          body: jsonEncode({
            'phone': phone,
            'role': role,
            if (fullName != null && fullName.trim().isNotEmpty)
              'full_name': fullName.trim(),
            if (wardId != null) 'ward_id': wardId,
          }),
        )
        .timeout(_timeout);
    if (res.statusCode == 200 || res.statusCode == 201) {
      return OtpChallengeResult.fromJson(
        jsonDecode(res.body) as Map<String, dynamic>,
      );
    }
    throw CleanSavarApiException(
      res.statusCode,
      _extractErrorMessage(res.body, res.statusCode),
    );
  }

  Future<OtpAuthResult> verifyOtp({
    required String phone,
    required String otp,
    String? nameBn,
    int? wardId,
  }) async {
    final res = await _client
        .post(
          Uri.parse('$baseUrl/auth/otp-verify'),
          headers: _headers(),
          body: jsonEncode({
            'phone': phone,
            'otp': otp,
          }),
        )
        .timeout(_timeout);
    if (res.statusCode == 200) {
      final result = OtpAuthResult.fromJson(
        jsonDecode(res.body) as Map<String, dynamic>,
      );
      if (result.token.isNotEmpty) {
        setAuthToken(result.token);
      }
      return result;
    }
    throw CleanSavarApiException(
      res.statusCode,
      _extractErrorMessage(res.body, res.statusCode),
    );
  }

  Future<OtpAuthResult> loginWithFirebaseToken({
    required String idToken,
    String? phone,
    String? fullName,
    int? wardId,
    String? role,
  }) async {
    final res = await _client
        .post(
          Uri.parse('$baseUrl/auth/firebase-login'),
          headers: _headers(),
          body: jsonEncode({
            'id_token': idToken,
            if (phone != null && phone.trim().isNotEmpty) 'phone': phone.trim(),
            if (fullName != null && fullName.trim().isNotEmpty)
              'full_name': fullName.trim(),
            if (wardId != null) 'ward_id': wardId,
            if (role != null && role.trim().isNotEmpty) 'role': role.trim(),
          }),
        )
        .timeout(_timeout);
    if (res.statusCode == 200) {
      final result = OtpAuthResult.fromJson(
        jsonDecode(res.body) as Map<String, dynamic>,
      );
      if (result.token.isNotEmpty) {
        setAuthToken(result.token);
      }
      return result;
    }
    throw CleanSavarApiException(
      res.statusCode,
      _extractErrorMessage(res.body, res.statusCode),
    );
  }

  Future<Map<String, dynamic>> completeCollectorTask({
    required String id,
    required double weightKg,
    required String idempotencyKey,
    bool qrVerified = false,
    String? completionPhotoUrl,
    String taskKind = 'pickup',
  }) async {
    final normalizedType = taskKind == 'dump_report' ? 'dump_report' : 'pickup';
    final res = await _client
        .patch(
          Uri.parse('$baseUrl/collector/tasks/$id/complete'),
          headers: _headers(idempotencyKey: idempotencyKey),
          body: jsonEncode({
            'task_type': normalizedType,
            'weight_kg': weightKg,
            if (completionPhotoUrl != null)
              'completion_photo_url': completionPhotoUrl,
            'notes': qrVerified ? 'QR যাচাইকৃত সংগ্রহ' : '',
          }),
        )
        .timeout(_timeout);
    if (res.statusCode == 200) {
      return jsonDecode(res.body) as Map<String, dynamic>;
    }
    throw CleanSavarApiException(
      res.statusCode,
      _extractErrorMessage(res.body, res.statusCode),
    );
  }

  Future<Map<String, dynamic>?> trackByQuery(
    String query, {
    String? phone,
  }) async {
    final cleaned = query.trim();
    if (cleaned.isEmpty) return null;
    final upper = cleaned.toUpperCase();
    final qp = (phone != null && phone.trim().isNotEmpty)
        ? {'phone': phone.trim()}
        : null;

    if (upper.startsWith('CS-PK-')) {
      final uri = Uri.parse('$baseUrl/pickups/track/${Uri.encodeComponent(upper)}')
          .replace(queryParameters: qp);
      final res = await _client.get(uri, headers: _headers()).timeout(_timeout);
      if (res.statusCode == 200) {
        return {
          'kind': 'pickup',
          ...(jsonDecode(res.body) as Map<String, dynamic>),
        };
      }
      if (res.statusCode == 404) return null;
      throw CleanSavarApiException(
        res.statusCode,
        _extractErrorMessage(res.body, res.statusCode),
      );
    }

    if (upper.startsWith('CS-DR-')) {
      final uri = Uri.parse('$baseUrl/reports/track/${Uri.encodeComponent(upper)}')
          .replace(queryParameters: qp);
      final res = await _client.get(uri, headers: _headers()).timeout(_timeout);
      if (res.statusCode == 200) {
        return {
          'kind': 'dump_report',
          ...(jsonDecode(res.body) as Map<String, dynamic>),
        };
      }
      if (res.statusCode == 404) return null;
      throw CleanSavarApiException(
        res.statusCode,
        _extractErrorMessage(res.body, res.statusCode),
      );
    }

    if (_authToken != null) {
      final pickupsUri = Uri.parse('$baseUrl/pickups').replace(
        queryParameters: {'phone': cleaned},
      );
      final res =
          await _client.get(pickupsUri, headers: _headers()).timeout(_timeout);
      if (res.statusCode == 200) {
        final raw = jsonDecode(res.body) as List<dynamic>;
        if (raw.isNotEmpty) {
          final first = raw.first as Map<String, dynamic>;
          final code = (first['tracking_code'] ?? '').toString();
          if (code.isNotEmpty) {
            return trackByQuery(code, phone: cleaned);
          }
        }
      }
    }
    return null;
  }

  Future<void> logout() async {
    if (_authToken == null) return;
    try {
      await _client
          .post(
            Uri.parse('$baseUrl/auth/logout'),
            headers: _headers(),
          )
          .timeout(_timeout);
    } catch (_) {
      // Best-effort token revocation; local session still clears below.
    } finally {
      setAuthToken(null);
    }
  }
}
