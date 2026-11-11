import 'package:clean_savar_core/clean_savar_core.dart' as core;

/// Savar Pourashava & Union metadata used for area chips and GPS ward matching.
class WardInfo {
  const WardInfo({
    required this.id,
    required this.code,
    required this.areaChipLabel,
    required this.fullNameBn,
    required this.supervisorName,
    required this.supervisorPhone,
    required this.lat,
    required this.lng,
  });

  final int id;
  final String code;
  final String areaChipLabel;
  final String fullNameBn;
  final String supervisorName;
  final String supervisorPhone;
  final double lat;
  final double lng;

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'code': code,
      'areaChipLabel': areaChipLabel,
      'fullNameBn': fullNameBn,
      'supervisorName': supervisorName,
      'supervisorPhone': supervisorPhone,
      'lat': lat,
      'lng': lng,
    };
  }

  factory WardInfo.fromJson(Map<String, dynamic> json) {
    return WardInfo(
      id: (json['id'] as num).toInt(),
      code: json['code'] as String,
      areaChipLabel: json['areaChipLabel'] as String,
      fullNameBn: json['fullNameBn'] as String,
      supervisorName: json['supervisorName'] as String,
      supervisorPhone: json['supervisorPhone'] as String,
      lat: (json['lat'] as num).toDouble(),
      lng: (json['lng'] as num).toDouble(),
    );
  }

  factory WardInfo.fromCore(core.SavarWard w) {
    return WardInfo(
      id: w.id,
      code: w.code,
      areaChipLabel: '${w.zoneLabelBn}, সাভার - ${w.id <= 9 ? 'ওয়ার্ড ${w.id}' : 'ইউনিয়ন'}',
      fullNameBn: w.nameBn,
      supervisorName: w.supervisorName,
      supervisorPhone: w.supervisorPhone,
      lat: w.centroidLat,
      lng: w.centroidLng,
    );
  }
}
