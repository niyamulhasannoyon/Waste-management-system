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

  RouteStop copyWith({
    bool? qrVerified,
    double? weightKg,
    bool? isCompleted,
    String? completedAtLabel,
    bool? syncedToServer,
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
    );
  }
}
