import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

enum WasteType {
  household('household', 'বাসাবাড়ির ময়লা'),
  organic('organic', 'পচনশীল ও সবজির ময়লা'),
  recyclable('recyclable', 'প্লাস্টিক ও কাগজ'),
  bulky('bulky', 'বড় বা ভারী আবর্জনা');

  const WasteType(this.apiValue, this.labelBn);
  final String apiValue;
  final String labelBn;
}

enum PickupSlot {
  morning('morning', 'সকাল ৭–১০টা'),
  afternoon('afternoon', 'দুপুর ২–৫টা'),
  evening('evening', 'বিকাল ৫–৮টা');

  const PickupSlot(this.apiValue, this.labelBn);
  final String apiValue;
  final String labelBn;
}

enum ReportSeverity {
  medium('medium', 'সাধারণ'),
  high('high', 'জরুরি'),
  critical('critical', 'অত্যন্ত জরুরি');

  const ReportSeverity(this.apiValue, this.labelBn);
  final String apiValue;
  final String labelBn;
}

class SavarWard {
  const SavarWard({
    required this.id,
    required this.code,
    required this.nameBn,
    required this.zoneLabelBn,
    required this.supervisorName,
    required this.supervisorPhone,
    required this.centroidLat,
    required this.centroidLng,
    this.pendingPickups = 0,
    this.openReports = 0,
    this.activeVehicles = 1,
  });

  final int id;
  final String code;
  final String nameBn;
  final String zoneLabelBn;
  final String supervisorName;
  final String supervisorPhone;
  final double centroidLat;
  final double centroidLng;
  final int pendingPickups;
  final int openReports;
  final int activeVehicles;

  factory SavarWard.fromJson(Map<String, dynamic> json) {
    return SavarWard(
      id: (json['id'] as num).toInt(),
      code: json['code'] as String,
      nameBn: json['name_bn'] as String,
      zoneLabelBn: json['zone_label_bn'] as String,
      supervisorName: json['supervisor_name'] as String,
      supervisorPhone: json['supervisor_phone'] as String,
      centroidLat: (json['centroid_lat'] as num).toDouble(),
      centroidLng: (json['centroid_lng'] as num).toDouble(),
      pendingPickups: (json['pending_pickups'] as num?)?.toInt() ?? 0,
      openReports: (json['open_reports'] as num?)?.toInt() ?? 0,
      activeVehicles: (json['active_vehicles'] as num?)?.toInt() ?? 0,
    );
  }
}

class PickupRequestItem {
  const PickupRequestItem({
    required this.id,
    required this.trackingCode,
    required this.citizenName,
    required this.citizenPhone,
    required this.wardId,
    required this.wardNameBn,
    required this.addressLine,
    required this.wasteType,
    required this.slot,
    required this.estimatedBags,
    required this.status,
    required this.lat,
    required this.lng,
    this.assignedVehicleCode,
    this.synced = true,
  });

  final String id;
  final String trackingCode;
  final String citizenName;
  final String citizenPhone;
  final int wardId;
  final String wardNameBn;
  final String addressLine;
  final String wasteType;
  final String slot;
  final int estimatedBags;
  final String status;
  final double lat;
  final double lng;
  final String? assignedVehicleCode;
  final bool synced;

  factory PickupRequestItem.fromJson(Map<String, dynamic> json) {
    return PickupRequestItem(
      id: json['id'] as String,
      trackingCode: json['tracking_code'] as String,
      citizenName: json['citizen_name'] as String,
      citizenPhone: json['citizen_phone'] as String,
      wardId: (json['ward_id'] as num).toInt(),
      wardNameBn: json['ward_name_bn'] as String,
      addressLine: json['address_line'] as String,
      wasteType: json['waste_type'] as String,
      slot: json['slot'] as String,
      estimatedBags: (json['estimated_bags'] as num).toInt(),
      status: json['status'] as String,
      lat: (json['lat'] as num).toDouble(),
      lng: (json['lng'] as num).toDouble(),
      assignedVehicleCode: json['assigned_vehicle_code'] as String?,
    );
  }
}

class DumpReportItem {
  const DumpReportItem({
    required this.id,
    required this.trackingCode,
    required this.reporterPhone,
    required this.wardId,
    required this.wardNameBn,
    required this.titleBn,
    required this.landmark,
    required this.severity,
    required this.status,
    required this.lat,
    required this.lng,
    this.photoUrls = const [],
    this.assignedVehicleCode,
  });

  final String id;
  final String trackingCode;
  final String reporterPhone;
  final int wardId;
  final String wardNameBn;
  final String titleBn;
  final String landmark;
  final String severity;
  final String status;
  final double lat;
  final double lng;
  final List<String> photoUrls;
  final String? assignedVehicleCode;

  factory DumpReportItem.fromJson(Map<String, dynamic> json) {
    final photos = (json['photo_urls'] as List<dynamic>?)
            ?.map((e) => e.toString())
            .toList() ??
        const [];
    return DumpReportItem(
      id: (json['id'] ?? '').toString(),
      trackingCode: (json['tracking_code'] ?? '').toString(),
      reporterPhone: (json['reporter_phone'] ?? '').toString(),
      wardId: (json['ward_id'] as num?)?.toInt() ?? 3,
      wardNameBn: (json['ward_name_bn'] ?? '').toString(),
      titleBn: (json['title_bn'] ?? '').toString(),
      landmark: (json['landmark'] ?? '').toString(),
      severity: (json['severity'] ?? 'medium').toString(),
      status: (json['status'] ?? 'reported').toString(),
      lat: (json['lat'] as num?)?.toDouble() ?? 23.8492,
      lng: (json['lng'] as num?)?.toDouble() ?? 90.2546,
      photoUrls: photos,
      assignedVehicleCode: json['assigned_vehicle_code'] as String?,
    );
  }
}

String statusLabelBn(String status) {
  return switch (status) {
    'pending' => 'অপেক্ষমাণ',
    'assigned' => 'গাড়ি নির্ধারিত',
    'in_progress' => 'সংগ্রহ চলছে',
    'collected' => 'নেওয়া সম্পন্ন',
    'reported' => 'রিপোর্ট জমা',
    'verified' => 'যাচাইকৃত',
    'dispatched' => 'টিম রওনা হয়েছে',
    'cleared' => 'পরিষ্কার হয়েছে',
    _ => status,
  };
}

Color statusColor(String status) {
  return switch (status) {
    'collected' || 'cleared' => CleanSavarColors.primaryGreen,
    'assigned' || 'in_progress' || 'verified' || 'dispatched' => CleanSavarColors.infoBlue,
    'cancelled' || 'rejected' => CleanSavarColors.dangerRed,
    _ => CleanSavarColors.warningAmber,
  };
}

class CollectorVehicleItem {
  const CollectorVehicleItem({
    required this.id,
    required this.code,
    required this.driverNameBn,
    required this.driverPhone,
    required this.wardId,
    required this.vehicleType,
    required this.status,
    required this.currentLat,
    required this.currentLng,
    required this.capacityKg,
  });

  final String id;
  final String code;
  final String driverNameBn;
  final String driverPhone;
  final int wardId;
  final String vehicleType;
  final String status;
  final double currentLat;
  final double currentLng;
  final int capacityKg;

  factory CollectorVehicleItem.fromJson(Map<String, dynamic> json) {
    final latNum = (json['lat'] ?? json['current_lat']) as num?;
    final lngNum = (json['lng'] ?? json['current_lng']) as num?;
    return CollectorVehicleItem(
      id: (json['id'] ?? '').toString(),
      code: (json['code'] ?? '').toString(),
      driverNameBn: (json['driver_name_bn'] ?? '').toString(),
      driverPhone: (json['driver_phone'] ?? '').toString(),
      wardId: (json['ward_id'] as num?)?.toInt() ?? 3,
      vehicleType: (json['vehicle_type'] ?? 'rickshaw_van').toString(),
      status: (json['status'] ?? 'available').toString(),
      currentLat: latNum?.toDouble() ?? 23.8492,
      currentLng: lngNum?.toDouble() ?? 90.2546,
      capacityKg: (json['capacity_kg'] as num?)?.toInt() ?? 500,
    );
  }
}

class OtpChallengeResult {
  const OtpChallengeResult({
    required this.phone,
    required this.role,
    required this.expiresInSeconds,
    this.devOtpPreview,
    this.messageBn,
  });

  final String phone;
  final String role;
  final int expiresInSeconds;
  final String? devOtpPreview;
  final String? messageBn;

  factory OtpChallengeResult.fromJson(Map<String, dynamic> json) {
    return OtpChallengeResult(
      phone: (json['phone'] ?? '').toString(),
      role: (json['role'] as String?) ?? 'citizen',
      expiresInSeconds: (json['expires_in_seconds'] as num?)?.toInt() ?? 300,
      devOtpPreview: (json['otp_preview'] ?? json['dev_otp_preview']) as String?,
      messageBn: (json['message_bn'] ?? json['message']) as String?,
    );
  }
}

class OtpAuthResult {
  const OtpAuthResult({
    required this.token,
    required this.userId,
    required this.phone,
    required this.role,
    this.nameBn,
    this.wardId,
    this.expiresAt,
    this.vehicleId,
  });

  final String token;
  final String userId;
  final String phone;
  final String role;
  final String? nameBn;
  final int? wardId;
  final String? expiresAt;
  final String? vehicleId;

  factory OtpAuthResult.fromJson(Map<String, dynamic> json) {
    final profile = json['profile'] as Map<String, dynamic>?;
    final user = (profile?['user'] ?? json['user'] ?? json) as Map<String, dynamic>;
    final rawToken = (json['access_token'] ?? json['token'] ?? '').toString();
    return OtpAuthResult(
      token: rawToken,
      userId: (user['id'] ?? user['user_id'] ?? '').toString(),
      phone: (user['phone'] ?? '').toString(),
      role: (user['role'] as String?) ?? 'citizen',
      nameBn: (user['full_name'] ?? user['name_bn']) as String?,
      wardId: (user['ward_id'] as num?)?.toInt(),
      expiresAt: json['expires_at'] as String?,
      vehicleId: profile?['vehicle_id'] as String?,
    );
  }
}
