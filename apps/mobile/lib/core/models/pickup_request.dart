enum WasteCategory {
  household(labelBn: 'গৃহস্থালি ময়লা', hintBn: 'প্রতিদিনের মিশ্র বর্জ্য'),
  organic(labelBn: 'পচনশীল (সবুজ বিন)', hintBn: 'রান্নাঘরের উচ্ছিষ্ট ও সবজি'),
  recyclable(labelBn: 'রিসাইকেলযোগ্য (নীল বিন)', hintBn: 'প্লাস্টিক, কাগজ ও বোতল'),
  bulky(labelBn: 'ভারী বর্জ্য', hintBn: 'ভাঙা আসবাব বা গাছের ডাল');

  const WasteCategory({required this.labelBn, required this.hintBn});

  final String labelBn;
  final String hintBn;
}

enum PickupSlot {
  morning(labelBn: 'সকাল ৭:০০ - ১০:০০'),
  afternoon(labelBn: 'দুপুর ২:০০ - ৫:০০'),
  evening(labelBn: 'বিকাল ৫:০০ - ৮:০০');

  const PickupSlot({required this.labelBn});

  final String labelBn;
}

enum PickupStatus {
  pending(labelBn: 'অপেক্ষমাণ'),
  assigned(labelBn: 'গাড়ি নির্ধারিত'),
  inProgress(labelBn: 'সংগ্রহ চলছে'),
  collected(labelBn: 'নেওয়া সম্পন্ন');

  const PickupStatus({required this.labelBn});

  final String labelBn;
}

class PickupRequest {
  const PickupRequest({
    required this.id,
    required this.trackingCode,
    required this.addressLine,
    required this.wardLabel,
    required this.category,
    required this.slot,
    required this.estimatedBags,
    required this.status,
    required this.createdAtLabel,
    this.assignedCollectorName,
    this.assignedVehicleCode,
    this.notes = '',
  });

  final String id;
  final String trackingCode;
  final String addressLine;
  final String wardLabel;
  final WasteCategory category;
  final PickupSlot slot;
  final int estimatedBags;
  final PickupStatus status;
  final String createdAtLabel;
  final String? assignedCollectorName;
  final String? assignedVehicleCode;
  final String notes;
}
