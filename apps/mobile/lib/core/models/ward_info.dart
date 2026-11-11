/// Savar Pourashava ward metadata used for area chips and GPS ward matching.
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
}
