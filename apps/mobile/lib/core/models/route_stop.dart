import 'package:clean_savar_core/clean_savar_core.dart' as core;

/// Assigned household/commercial collection stop for the Collector Mode route.
class RouteStop {
  const RouteStop({
    required this.id,
    required this.houseNumber,
    required this.roadName,
    required this.areaLabel,
    required this.residentName,
    required this.residentPhone,
    required this.expectedQrCode,
    this.qrVerified = false,
    this.weightKg,
    this.isCompleted = false,
    this.completedAtLabel,
    this.syncedToServer = true,
    this.taskKind = 'pickup',
    this.idempotencyKey,
  });

  final String id;
  final String houseNumber;
  final String roadName;
  final String areaLabel;
  final String residentName;
  final String residentPhone;
  final String expectedQrCode;
  final bool qrVerified;
  final double? weightKg;
  final bool isCompleted;
  final String? completedAtLabel;
  final bool syncedToServer;
  final String taskKind;
  final String? idempotencyKey;

  RouteStop copyWith({
    bool? qrVerified,
    double? weightKg,
    bool? isCompleted,
    String? completedAtLabel,
    bool? syncedToServer,
    String? idempotencyKey,
  }) {
    return RouteStop(
      id: id,
      houseNumber: houseNumber,
      roadName: roadName,
      areaLabel: areaLabel,
      residentName: residentName,
      residentPhone: residentPhone,
      expectedQrCode: expectedQrCode,
      qrVerified: qrVerified ?? this.qrVerified,
      weightKg: weightKg ?? this.weightKg,
      isCompleted: isCompleted ?? this.isCompleted,
      completedAtLabel: completedAtLabel ?? this.completedAtLabel,
      syncedToServer: syncedToServer ?? this.syncedToServer,
      taskKind: taskKind,
      idempotencyKey: idempotencyKey ?? this.idempotencyKey,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'houseNumber': houseNumber,
      'roadName': roadName,
      'areaLabel': areaLabel,
      'residentName': residentName,
      'residentPhone': residentPhone,
      'expectedQrCode': expectedQrCode,
      'qrVerified': qrVerified,
      'weightKg': weightKg,
      'isCompleted': isCompleted,
      'completedAtLabel': completedAtLabel,
      'syncedToServer': syncedToServer,
      'taskKind': taskKind,
      'idempotencyKey': idempotencyKey,
    };
  }

  factory RouteStop.fromJson(Map<String, dynamic> json) {
    return RouteStop(
      id: json['id'] as String,
      houseNumber: json['houseNumber'] as String,
      roadName: json['roadName'] as String,
      areaLabel: json['areaLabel'] as String,
      residentName: json['residentName'] as String,
      residentPhone: json['residentPhone'] as String,
      expectedQrCode: json['expectedQrCode'] as String,
      qrVerified: (json['qrVerified'] as bool?) ?? false,
      weightKg: (json['weightKg'] as num?)?.toDouble(),
      isCompleted: (json['isCompleted'] as bool?) ?? false,
      completedAtLabel: json['completedAtLabel'] as String?,
      syncedToServer: (json['syncedToServer'] as bool?) ?? true,
      taskKind: (json['taskKind'] as String?) ?? 'pickup',
      idempotencyKey: json['idempotencyKey'] as String?,
    );
  }

  factory RouteStop.fromCorePickup(core.PickupRequestItem item) {
    final completed = item.status == 'collected';
    return RouteStop(
      id: item.id,
      houseNumber: item.trackingCode,
      roadName: item.addressLine,
      areaLabel: item.wardNameBn,
      residentName: item.citizenName,
      residentPhone: item.citizenPhone,
      expectedQrCode: item.trackingCode,
      qrVerified: completed,
      isCompleted: completed,
      completedAtLabel: completed ? 'সার্ভার সম্পন্ন' : null,
      syncedToServer: true,
      taskKind: 'pickup',
    );
  }
}
