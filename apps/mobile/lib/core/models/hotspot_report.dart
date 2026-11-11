import 'package:clean_savar_core/clean_savar_core.dart' as core;

enum ReportIssueCategory {
  roadsideGarbage(labelBn: 'রাস্তার পাশে ময়লা'),
  drainBlocked(labelBn: 'ড্রেন জ্যাম'),
  binOverflow(labelBn: 'ডাস্টবিন উপচে পড়ছে'),
  badOdor(labelBn: 'দুর্গন্ধ');

  const ReportIssueCategory({required this.labelBn});

  final String labelBn;

  static ReportIssueCategory fromName(String name) {
    return ReportIssueCategory.values.firstWhere(
      (e) => e.name == name,
      orElse: () => ReportIssueCategory.roadsideGarbage,
    );
  }
}

enum HotspotStatus {
  reported(labelBn: 'রিপোর্ট জমা', apiValue: 'reported'),
  verified(labelBn: 'যাচাইকৃত', apiValue: 'verified'),
  dispatched(labelBn: 'টিম রওনা হয়েছে', apiValue: 'dispatched'),
  cleared(labelBn: 'পরিষ্কার হয়েছে', apiValue: 'cleared');

  const HotspotStatus({required this.labelBn, required this.apiValue});

  final String labelBn;
  final String apiValue;

  static HotspotStatus fromApiValue(String value) {
    return HotspotStatus.values.firstWhere(
      (e) => e.apiValue == value || e.name == value,
      orElse: () => HotspotStatus.reported,
    );
  }
}

class HotspotReport {
  const HotspotReport({
    required this.id,
    required this.trackingCode,
    required this.wardId,
    required this.wardLabel,
    required this.landmark,
    required this.categories,
    required this.note,
    required this.lat,
    required this.lng,
    required this.status,
    required this.reportedAtLabel,
    required this.hasPhoto,
    this.photoMetaLabel,
    this.photoPath,
    this.photoUrls = const [],
    this.synced = true,
  });

  final String id;
  final String trackingCode;
  final int wardId;
  final String wardLabel;
  final String landmark;
  final List<ReportIssueCategory> categories;
  final String note;
  final double lat;
  final double lng;
  final HotspotStatus status;
  final String reportedAtLabel;
  final bool hasPhoto;
  final String? photoMetaLabel;
  final String? photoPath;
  final List<String> photoUrls;
  final bool synced;

  String get primaryTitleBn {
    if (categories.isEmpty) {
      return 'বর্জ্য স্তূপ রিপোর্ট';
    }
    return categories.map((c) => c.labelBn).join(' • ');
  }

  HotspotReport copyWith({
    String? id,
    String? trackingCode,
    HotspotStatus? status,
    List<String>? photoUrls,
    bool? synced,
  }) {
    return HotspotReport(
      id: id ?? this.id,
      trackingCode: trackingCode ?? this.trackingCode,
      wardId: wardId,
      wardLabel: wardLabel,
      landmark: landmark,
      categories: categories,
      note: note,
      lat: lat,
      lng: lng,
      status: status ?? this.status,
      reportedAtLabel: reportedAtLabel,
      hasPhoto: hasPhoto,
      photoMetaLabel: photoMetaLabel,
      photoPath: photoPath,
      photoUrls: photoUrls ?? this.photoUrls,
      synced: synced ?? this.synced,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'trackingCode': trackingCode,
      'wardId': wardId,
      'wardLabel': wardLabel,
      'landmark': landmark,
      'categories': categories.map((c) => c.name).toList(),
      'note': note,
      'lat': lat,
      'lng': lng,
      'status': status.apiValue,
      'reportedAtLabel': reportedAtLabel,
      'hasPhoto': hasPhoto,
      'photoMetaLabel': photoMetaLabel,
      'photoPath': photoPath,
      'photoUrls': photoUrls,
      'synced': synced,
    };
  }

  factory HotspotReport.fromJson(Map<String, dynamic> json) {
    final cats = (json['categories'] as List<dynamic>?)
            ?.map((e) => ReportIssueCategory.fromName(e.toString()))
            .toList() ??
        const [ReportIssueCategory.roadsideGarbage];
    final urls = (json['photoUrls'] as List<dynamic>?)
            ?.map((e) => e.toString())
            .toList() ??
        const <String>[];
    return HotspotReport(
      id: json['id'] as String,
      trackingCode: json['trackingCode'] as String,
      wardId: (json['wardId'] as num).toInt(),
      wardLabel: json['wardLabel'] as String,
      landmark: json['landmark'] as String,
      categories: cats,
      note: json['note'] as String,
      lat: (json['lat'] as num).toDouble(),
      lng: (json['lng'] as num).toDouble(),
      status: HotspotStatus.fromApiValue(json['status'] as String),
      reportedAtLabel: json['reportedAtLabel'] as String,
      hasPhoto: (json['hasPhoto'] as bool?) ?? false,
      photoMetaLabel: json['photoMetaLabel'] as String?,
      photoPath: json['photoPath'] as String?,
      photoUrls: urls,
      synced: (json['synced'] as bool?) ?? true,
    );
  }

  factory HotspotReport.fromCore(core.DumpReportItem item) {
    return HotspotReport(
      id: item.id,
      trackingCode: item.trackingCode,
      wardId: item.wardId,
      wardLabel: item.wardNameBn,
      landmark: item.landmark,
      categories: const [ReportIssueCategory.roadsideGarbage],
      note: item.titleBn,
      lat: item.lat,
      lng: item.lng,
      status: HotspotStatus.fromApiValue(item.status),
      reportedAtLabel: 'সার্ভার থেকে সিঙ্ককৃত',
      hasPhoto: item.photoUrls.isNotEmpty,
      photoMetaLabel: item.photoUrls.isNotEmpty ? 'সার্ভার ছবি সংযুক্ত' : null,
      photoUrls: item.photoUrls,
      synced: true,
    );
  }
}
