enum ReportIssueCategory {
  roadsideGarbage(labelBn: 'রাস্তার পাশে ময়লা'),
  drainBlocked(labelBn: 'ড্রেন জ্যাম'),
  binOverflow(labelBn: 'ডাস্টবিন উপচে পড়ছে'),
  badOdor(labelBn: 'দুর্গন্ধ');

  const ReportIssueCategory({required this.labelBn});

  final String labelBn;
}

enum HotspotStatus {
  reported(labelBn: 'রিপোর্ট জমা'),
  verified(labelBn: 'যাচাইকৃত'),
  dispatched(labelBn: 'টিম রওনা হয়েছে'),
  cleared(labelBn: 'পরিষ্কার হয়েছে');

  const HotspotStatus({required this.labelBn});

  final String labelBn;
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

  String get primaryTitleBn {
    if (categories.isEmpty) {
      return 'বর্জ্য স্তূপ রিপোর্ট';
    }
    return categories.map((c) => c.labelBn).join(' • ');
  }
}
