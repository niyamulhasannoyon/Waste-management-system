import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

import '../data/savar_wards_seed.dart';
import '../models/savar_models.dart';

class CleanSavarApiClient {
  CleanSavarApiClient({
    String? baseUrl,
    http.Client? httpClient,
  })  : baseUrl = (baseUrl ??
                const String.fromEnvironment(
                  'API_BASE_URL',
                  defaultValue: 'http://10.0.2.2:8080/api/v1',
                ))
            .replaceAll(RegExp(r'/$'), ''),
        _client = httpClient ?? http.Client();

  final String baseUrl;
  final http.Client _client;
  static const Duration _timeout = Duration(seconds: 6);

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
  }) async {
    final res = await _client
        .post(
          Uri.parse('$baseUrl/pickups'),
          headers: const {'Content-Type': 'application/json'},
          body: jsonEncode({
            'citizen_name': citizenName,
            'citizen_phone': citizenPhone,
            'ward_id': wardId,
            'address_line': addressLine,
            'landmark': landmark,
            'waste_type': wasteType.apiValue,
            'slot': slot.apiValue,
            'estimated_bags': estimatedBags,
            'lat': lat,
            'lng': lng,
          }),
        )
        .timeout(_timeout);

    if (res.statusCode == 201) {
      return PickupRequestItem.fromJson(jsonDecode(res.body) as Map<String, dynamic>);
    }
    throw HttpException('Server error ${res.statusCode}');
  }

  Future<String> uploadPhoto(File imageFile) async {
    final req = http.MultipartRequest('POST', Uri.parse('$baseUrl/uploads/photo'))
      ..files.add(await http.MultipartFile.fromPath('photo', imageFile.path));
    final streamed = await req.send().timeout(const Duration(seconds: 15));
    final body = await streamed.stream.bytesToString();
    if (streamed.statusCode == 201) {
      final json = jsonDecode(body) as Map<String, dynamic>;
      return json['url'] as String;
    }
    throw HttpException('Photo upload failed: ${streamed.statusCode}');
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
  }) async {
    final res = await _client
        .post(
          Uri.parse('$baseUrl/reports'),
          headers: const {'Content-Type': 'application/json'},
          body: jsonEncode({
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
      return DumpReportItem.fromJson(jsonDecode(res.body) as Map<String, dynamic>);
    }
    throw HttpException('Server error ${res.statusCode}');
  }

  Future<List<PickupRequestItem>> fetchPickups({int? wardId, String? status}) async {
    final params = <String, String>{};
    if (wardId != null) params['ward_id'] = '$wardId';
    if (status != null) params['status'] = status;
    final uri = Uri.parse('$baseUrl/pickups').replace(queryParameters: params.isEmpty ? null : params);
    final res = await _client.get(uri).timeout(_timeout);
    if (res.statusCode == 200) {
      final raw = jsonDecode(res.body) as List<dynamic>;
      return raw.map((e) => PickupRequestItem.fromJson(e as Map<String, dynamic>)).toList();
    }
    throw HttpException('Failed loading pickups: ${res.statusCode}');
  }

  Future<List<DumpReportItem>> fetchReports({int? wardId, String? status}) async {
    final params = <String, String>{};
    if (wardId != null) params['ward_id'] = '$wardId';
    if (status != null) params['status'] = status;
    final uri = Uri.parse('$baseUrl/reports').replace(queryParameters: params.isEmpty ? null : params);
    final res = await _client.get(uri).timeout(_timeout);
    if (res.statusCode == 200) {
      final raw = jsonDecode(res.body) as List<dynamic>;
      return raw.map((e) => DumpReportItem.fromJson(e as Map<String, dynamic>)).toList();
    }
    throw HttpException('Failed loading reports: ${res.statusCode}');
  }

  Future<void> updatePickupStatus(String id, String status) async {
    final res = await _client
        .patch(
          Uri.parse('$baseUrl/pickups/$id/status'),
          headers: const {'Content-Type': 'application/json'},
          body: jsonEncode({'status': status}),
        )
        .timeout(_timeout);
    if (res.statusCode != 200) {
      throw HttpException('Status update failed: ${res.statusCode}');
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
          headers: const {'Content-Type': 'application/json'},
          body: jsonEncode({
            'status': status,
            'resolved_photo_url': resolvedPhotoUrl,
          }),
        )
        .timeout(_timeout);
    if (res.statusCode != 200) {
      throw HttpException('Report update failed: ${res.statusCode}');
    }
  }

  Future<void> pingVehicleLocation(String vehicleId, double lat, double lng) async {
    await _client
        .patch(
          Uri.parse('$baseUrl/dispatch/vehicles/$vehicleId/location'),
          headers: const {'Content-Type': 'application/json'},
          body: jsonEncode({'lat': lat, 'lng': lng}),
        )
        .timeout(_timeout);
  }
}
