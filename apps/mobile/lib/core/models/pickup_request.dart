import 'package:clean_savar_core/clean_savar_core.dart' as core;

enum WasteCategory {
  household(labelBn: 'গৃহস্থালি ময়লা', hintBn: 'প্রতিদিনের মিশ্র বর্জ্য', apiValue: 'household'),
  organic(labelBn: 'পচনশীল (সবুজ বিন)', hintBn: 'রান্নাঘরের উচ্ছিষ্ট ও সবজি', apiValue: 'organic'),
  recyclable(labelBn: 'রিসাইকেলযোগ্য (নীল বিন)', hintBn: 'প্লাস্টিক, কাগজ ও বোতল', apiValue: 'recyclable'),
  bulky(labelBn: 'ভারী বর্জ্য', hintBn: 'ভাঙা আসবাব বা গাছের ডাল', apiValue: 'bulky');

  const WasteCategory({
    required this.labelBn,
    required this.hintBn,
    required this.apiValue,
  });

  final String labelBn;
  final String hintBn;
  final String apiValue;

  core.WasteType toCoreWasteType() {
    return switch (this) {
      WasteCategory.household => core.WasteType.household,
      WasteCategory.organic => core.WasteType.organic,
      WasteCategory.recyclable => core.WasteType.recyclable,
      WasteCategory.bulky => core.WasteType.bulky,
    };
  }

  static WasteCategory fromApiValue(String value) {
    return WasteCategory.values.firstWhere(
      (e) => e.apiValue == value || e.name == value,
      orElse: () => WasteCategory.household,
    );
  }
}

enum PickupSlot {
  morning(labelBn: 'সকাল ৭:০০ - ১০:০০', apiValue: 'morning'),
  afternoon(labelBn: 'দুপুর ২:০০ - ৫:০০', apiValue: 'afternoon'),
  evening(labelBn: 'বিকাল ৫:০০ - ৮:০০', apiValue: 'evening');

  const PickupSlot({required this.labelBn, required this.apiValue});

  final String labelBn;
  final String apiValue;

  core.PickupSlot toCoreSlot() {
    return switch (this) {
      PickupSlot.morning => core.PickupSlot.morning,
      PickupSlot.afternoon => core.PickupSlot.afternoon,
      PickupSlot.evening => core.PickupSlot.evening,
    };
  }

  static PickupSlot fromApiValue(String value) {
    return PickupSlot.values.firstWhere(
      (e) => e.apiValue == value || e.name == value,
      orElse: () => PickupSlot.morning,
    );
  }
}

enum PickupStatus {
  pending(labelBn: 'অপেক্ষমাণ', apiValue: 'pending'),
  assigned(labelBn: 'গাড়ি নির্ধারিত', apiValue: 'assigned'),
  inProgress(labelBn: 'সংগ্রহ চলছে', apiValue: 'in_progress'),
  collected(labelBn: 'নেওয়া সম্পন্ন', apiValue: 'collected');

  const PickupStatus({required this.labelBn, required this.apiValue});

  final String labelBn;
  final String apiValue;

  static PickupStatus fromApiValue(String value) {
    return PickupStatus.values.firstWhere(
      (e) => e.apiValue == value || e.name == value,
      orElse: () => PickupStatus.pending,
    );
  }
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
    this.wardId = 5,
    this.scheduleType = 'one_time',
    this.preferredDay,
    this.assignedCollectorName,
    this.assignedVehicleCode,
    this.notes = '',
    this.synced = true,
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
  final int wardId;
  final String scheduleType;
  final String? preferredDay;
  final String? assignedCollectorName;
  final String? assignedVehicleCode;
  final String notes;
  final bool synced;

  PickupRequest copyWith({
    String? id,
    String? trackingCode,
    PickupStatus? status,
    String? assignedCollectorName,
    String? assignedVehicleCode,
    bool? synced,
  }) {
    return PickupRequest(
      id: id ?? this.id,
      trackingCode: trackingCode ?? this.trackingCode,
      addressLine: addressLine,
      wardLabel: wardLabel,
      category: category,
      slot: slot,
      estimatedBags: estimatedBags,
      status: status ?? this.status,
      createdAtLabel: createdAtLabel,
      wardId: wardId,
      scheduleType: scheduleType,
      preferredDay: preferredDay,
      assignedCollectorName: assignedCollectorName ?? this.assignedCollectorName,
      assignedVehicleCode: assignedVehicleCode ?? this.assignedVehicleCode,
      notes: notes,
      synced: synced ?? this.synced,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'trackingCode': trackingCode,
      'addressLine': addressLine,
      'wardLabel': wardLabel,
      'wardId': wardId,
      'scheduleType': scheduleType,
      'preferredDay': preferredDay,
      'category': category.apiValue,
      'slot': slot.apiValue,
      'estimatedBags': estimatedBags,
      'status': status.apiValue,
      'createdAtLabel': createdAtLabel,
      'assignedCollectorName': assignedCollectorName,
      'assignedVehicleCode': assignedVehicleCode,
      'notes': notes,
      'synced': synced,
    };
  }

  factory PickupRequest.fromJson(Map<String, dynamic> json) {
    return PickupRequest(
      id: json['id'] as String,
      trackingCode: json['trackingCode'] as String,
      addressLine: json['addressLine'] as String,
      wardLabel: json['wardLabel'] as String,
      wardId: (json['wardId'] as num?)?.toInt() ?? 5,
      scheduleType: (json['scheduleType'] as String?) ?? 'one_time',
      preferredDay: json['preferredDay'] as String?,
      category: WasteCategory.fromApiValue(json['category'] as String),
      slot: PickupSlot.fromApiValue(json['slot'] as String),
      estimatedBags: (json['estimatedBags'] as num).toInt(),
      status: PickupStatus.fromApiValue(json['status'] as String),
      createdAtLabel: json['createdAtLabel'] as String,
      assignedCollectorName: json['assignedCollectorName'] as String?,
      assignedVehicleCode: json['assignedVehicleCode'] as String?,
      notes: (json['notes'] as String?) ?? '',
      synced: (json['synced'] as bool?) ?? true,
    );
  }

  factory PickupRequest.fromCore(core.PickupRequestItem item) {
    return PickupRequest(
      id: item.id,
      trackingCode: item.trackingCode,
      addressLine: item.addressLine,
      wardLabel: item.wardNameBn,
      wardId: item.wardId,
      category: WasteCategory.fromApiValue(item.wasteType),
      slot: PickupSlot.fromApiValue(item.slot),
      estimatedBags: item.estimatedBags,
      status: PickupStatus.fromApiValue(item.status),
      createdAtLabel: 'সার্ভার থেকে সিঙ্ককৃত',
      assignedVehicleCode: item.assignedVehicleCode,
      synced: item.synced,
    );
  }
}
