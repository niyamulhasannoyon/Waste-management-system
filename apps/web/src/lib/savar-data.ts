import type {
  AnalyticsSummary,
  CollectorVehicleRecord,
  DumpReportRecord,
  LotStatus,
  MaterialType,
  PickupRequestRecord,
  PickupSlot,
  PickupStatus,
  PreferredDay,
  PublicHotspotRecord,
  RecyclableLotRecord,
  ReportSeverity,
  ReportStatus,
  ScheduleType,
  VehicleStatus,
  VehicleType,
  WardSummary,
  WasteType,
} from './types';

/**
 * Canonical 15 Savar coverage zones matching PostgreSQL migration `0002_seed_savar_wards.sql`:
 * - Wards 1..9: Savar Pourashava (IDs 1..9)
 * - Unions 1..6: Savar Upazila Unions (IDs 101..106)
 */
export const SAVAR_WARDS_SEED: WardSummary[] = [
  {
    id: 1,
    code: 'WARD-01',
    zone_type: 'municipality_ward',
    ward_number: 1,
    name_bn: 'ওয়ার্ড ০১ — জামসিং ও মজিদপুর',
    name_en: 'Ward 01 - Jamsing & Majidpur',
    zone_label_bn: 'ওয়ার্ড ০১',
    neighborhoods: ['জামসিং', 'মজিদপুর', 'দক্ষিণ পাড়া', 'ভাটপাড়া'],
    schedule_bn: 'সকাল ৭:০০ – ৯:৩০',
    frequency_bn: 'প্রতিদিন',
    supervisor_name: 'কামরুল ইসলাম',
    supervisor_phone: '01711-000101',
    centroid_lat: 23.879,
    centroid_lng: 90.261,
    pending_pickups: 0,
    open_reports: 0,
    active_vehicles: 0,
  },
  {
    id: 2,
    code: 'WARD-02',
    zone_type: 'municipality_ward',
    ward_number: 2,
    name_bn: 'ওয়ার্ড ০২ — রেডিও কলোনি ও নামাবাজার',
    name_en: 'Ward 02 - Radio Colony & Namabazar',
    zone_label_bn: 'ওয়ার্ড ০২',
    neighborhoods: ['রেডিও কলোনি', 'নামাবাজার', 'কাতলাপুর', 'চাপাইন রোড'],
    schedule_bn: 'সকাল ৬:৩০ – ৯:০০',
    frequency_bn: 'প্রতিদিন',
    supervisor_name: 'রাশেদুল করিম',
    supervisor_phone: '01711-000102',
    centroid_lat: 23.864,
    centroid_lng: 90.256,
    pending_pickups: 2,
    open_reports: 1,
    active_vehicles: 1,
  },
  {
    id: 3,
    code: 'WARD-03',
    zone_type: 'municipality_ward',
    ward_number: 3,
    name_bn: 'ওয়ার্ড ০৩ — থানা রোড ও বাজার রোড',
    name_en: 'Ward 03 - Thana Road & Bazar Road',
    zone_label_bn: 'ওয়ার্ড ০৩',
    neighborhoods: ['থানা রোড', 'বাজার রোড', 'সাভার বাসস্ট্যান্ড', 'সিটি সেন্টার সংলগ্ন'],
    schedule_bn: 'সকাল ৬:০০ – ৮:৩০ ও বিকাল ৪:৩০',
    frequency_bn: 'দৈনিক ২ বার',
    supervisor_name: 'নাজমুল হুদা',
    supervisor_phone: '01711-000103',
    centroid_lat: 23.855,
    centroid_lng: 90.256,
    pending_pickups: 0,
    open_reports: 1,
    active_vehicles: 1,
  },
  {
    id: 4,
    code: 'WARD-04',
    zone_type: 'municipality_ward',
    ward_number: 4,
    name_bn: 'ওয়ার্ড ০৪ — ব্যাংক কলোনি ও ডগরমোড়া',
    name_en: 'Ward 04 - Bank Colony & Dogormora',
    zone_label_bn: 'ওয়ার্ড ০৪',
    neighborhoods: ['ব্যাংক কলোনি', 'ডগরমোড়া', 'কলেজ রোড', 'নতুন পাড়া'],
    schedule_bn: 'সকাল ৭:০০ – ১০:০০',
    frequency_bn: 'প্রতিদিন',
    supervisor_name: 'হাবিবুর রহমান',
    supervisor_phone: '01711-000104',
    centroid_lat: 23.854,
    centroid_lng: 90.264,
    pending_pickups: 0,
    open_reports: 0,
    active_vehicles: 1,
  },
  {
    id: 5,
    code: 'WARD-05',
    zone_type: 'municipality_ward',
    ward_number: 5,
    name_bn: 'ওয়ার্ড ০৫ — ব্যাংক টাউন ও পাকিজা',
    name_en: 'Ward 05 - Bank Town & Pakiza',
    zone_label_bn: 'ওয়ার্ড ০৫',
    neighborhoods: ['ব্যাংক টাউন আবাসিক', 'পাকিজা মিলস এলাকা', 'তারাপুর', 'এসি ল্যান্ড অফিস রোড'],
    schedule_bn: 'সকাল ৭:০০ – ৯:৩০',
    frequency_bn: 'প্রতিদিন',
    supervisor_name: 'আব্দুল কাদের',
    supervisor_phone: '01711-000105',
    centroid_lat: 23.847,
    centroid_lng: 90.259,
    pending_pickups: 1,
    open_reports: 0,
    active_vehicles: 1,
  },
  {
    id: 6,
    code: 'WARD-06',
    zone_type: 'municipality_ward',
    ward_number: 6,
    name_bn: 'ওয়ার্ড ০৬ — গেন্ডা ও আনন্দপুর',
    name_en: 'Ward 06 - Genda & Anandapur',
    zone_label_bn: 'ওয়ার্ড ০৬',
    neighborhoods: ['গেন্ডা', 'আনন্দপুর', 'সিআরপি রোড', 'লালটেক'],
    schedule_bn: 'সকাল ৭:৩০ – ১০:৩০',
    frequency_bn: 'প্রতিদিন',
    supervisor_name: 'মিজানুর রহমান',
    supervisor_phone: '01711-000106',
    centroid_lat: 23.845,
    centroid_lng: 90.267,
    pending_pickups: 0,
    open_reports: 0,
    active_vehicles: 0,
  },
  {
    id: 7,
    code: 'WARD-07',
    zone_type: 'municipality_ward',
    ward_number: 7,
    name_bn: 'ওয়ার্ড ০৭ — উলাইল ও কর্ণপাড়া',
    name_en: 'Ward 07 - Ulail & Kornapara',
    zone_label_bn: 'ওয়ার্ড ০৭',
    neighborhoods: ['উলাইল', 'কর্ণপাড়া', 'আল মুসলিম রোড', 'দক্ষিণ গেন্ডা'],
    schedule_bn: 'সকাল ৮:০০ – ১১:০০',
    frequency_bn: 'প্রতিদিন',
    supervisor_name: 'জাহাঙ্গীর আলম',
    supervisor_phone: '01711-000107',
    centroid_lat: 23.835,
    centroid_lng: 90.265,
    pending_pickups: 0,
    open_reports: 0,
    active_vehicles: 0,
  },
  {
    id: 8,
    code: 'WARD-08',
    zone_type: 'municipality_ward',
    ward_number: 8,
    name_bn: 'ওয়ার্ড ০৮ — রাজাশন ও আড়াপাড়া',
    name_en: 'Ward 08 - Rajashon & Arapara',
    zone_label_bn: 'ওয়ার্ড ০৮',
    neighborhoods: ['রাজাশন', 'আড়াপাড়া', 'পোদ্দার পাড়া', 'কলমা রোড'],
    schedule_bn: 'সকাল ৮:৩০ – ১১:৩০',
    frequency_bn: 'শনি, সোম, বুধ, শুক্র',
    supervisor_name: 'সেলিম মিয়া',
    supervisor_phone: '01711-000108',
    centroid_lat: 23.861,
    centroid_lng: 90.273,
    pending_pickups: 0,
    open_reports: 0,
    active_vehicles: 0,
  },
  {
    id: 9,
    code: 'WARD-09',
    zone_type: 'municipality_ward',
    ward_number: 9,
    name_bn: 'ওয়ার্ড ০৯ — ভাগলপুর ও বক্তারপুর',
    name_en: 'Ward 09 - Bhagalpur & Boktarpur',
    zone_label_bn: 'ওয়ার্ড ০৯',
    neighborhoods: ['ভাগলপুর', 'বক্তারপুর', 'বংশী নদীর পাড়', 'চন্দ্রিমা'],
    schedule_bn: 'সকাল ৯:০০ – ১২:০০',
    frequency_bn: 'শনি, রবি, মঙ্গল, বৃহস্পতি',
    supervisor_name: 'মোস্তফা কামাল',
    supervisor_phone: '01711-000109',
    centroid_lat: 23.854,
    centroid_lng: 90.246,
    pending_pickups: 0,
    open_reports: 0,
    active_vehicles: 0,
  },
  {
    id: 101,
    code: 'UNION-TETULJHORA',
    zone_type: 'union',
    ward_number: null,
    name_bn: 'তেঁতুলঝোড়া ইউনিয়ন',
    name_en: 'Tetuljhora Union',
    zone_label_bn: 'তেঁতুলঝোড়া',
    neighborhoods: ['হেমায়েতপুর', 'জয়নাবাড়ি', 'হরিণধরা', 'চামড়া শিল্প নগরী', 'নতুন পাড়া'],
    schedule_bn: 'সকাল ৮:৩০ – ১২:০০',
    frequency_bn: 'শনি, সোম, বুধ',
    supervisor_name: 'আনোয়ার হোসেন',
    supervisor_phone: '01711-000201',
    centroid_lat: 23.805,
    centroid_lng: 90.278,
    pending_pickups: 0,
    open_reports: 0,
    active_vehicles: 0,
  },
  {
    id: 102,
    code: 'UNION-ASHULIA',
    zone_type: 'union',
    ward_number: null,
    name_bn: 'আশুলিয়া ও ইয়ারপুর ইউনিয়ন',
    name_en: 'Ashulia & Yearpur Union',
    zone_label_bn: 'আশুলিয়া',
    neighborhoods: ['জিরাবো', 'জামগড়া', 'বাইপাইল', 'আশুলিয়া বাজার'],
    schedule_bn: 'সকাল ৮:০০ – ১১:৩০',
    frequency_bn: 'রবি, মঙ্গল, বৃহস্পতি',
    supervisor_name: 'সাইফুল ইসলাম',
    supervisor_phone: '01711-000202',
    centroid_lat: 23.91,
    centroid_lng: 90.295,
    pending_pickups: 0,
    open_reports: 0,
    active_vehicles: 0,
  },
  {
    id: 103,
    code: 'UNION-BIRULIA',
    zone_type: 'union',
    ward_number: null,
    name_bn: 'বিরুলিয়া ইউনিয়ন',
    name_en: 'Birulia Union',
    zone_label_bn: 'বিরুলিয়া',
    neighborhoods: ['বিরুলিয়া ব্রিজ', 'আকরান', 'গোলাপ গ্রাম (সাদুল্লাপুর)'],
    schedule_bn: 'সকাল ৯:০০ – ১২:৩০',
    frequency_bn: 'রবি, মঙ্গল, বৃহস্পতি',
    supervisor_name: 'লিটন আহমেদ',
    supervisor_phone: '01711-000203',
    centroid_lat: 23.852,
    centroid_lng: 90.315,
    pending_pickups: 0,
    open_reports: 0,
    active_vehicles: 0,
  },
  {
    id: 104,
    code: 'UNION-AMINBAZAR',
    zone_type: 'union',
    ward_number: null,
    name_bn: 'আমিনবাজার ইউনিয়ন',
    name_en: 'Aminbazar Union',
    zone_label_bn: 'আমিনবাজার',
    neighborhoods: ['বড়দেশী', 'বেগুনবাড়ি', 'আমিনবাজার ট্রাক টার্মিনাল', 'সালেহপুর'],
    schedule_bn: 'সকাল ৭:৩০ – ১১:০০',
    frequency_bn: 'প্রতিদিন',
    supervisor_name: 'শফিকুল ইসলাম',
    supervisor_phone: '01711-000204',
    centroid_lat: 23.79,
    centroid_lng: 90.325,
    pending_pickups: 0,
    open_reports: 0,
    active_vehicles: 0,
  },
  {
    id: 105,
    code: 'UNION-SAVAR-SADAR',
    zone_type: 'union',
    ward_number: null,
    name_bn: 'সাভার সদর ইউনিয়ন',
    name_en: 'Savar Sadar Union',
    zone_label_bn: 'সাভার সদর',
    neighborhoods: ['সিন্ধুরিয়া', 'কলমা', 'নয়ারহাট সংলগ্ন অংশ', 'চাঁপাইন'],
    schedule_bn: 'সকাল ৯:০০ – ১২:৩০',
    frequency_bn: 'শনি, সোম, বুধ',
    supervisor_name: 'রফিকুল আলম',
    supervisor_phone: '01711-000205',
    centroid_lat: 23.895,
    centroid_lng: 90.268,
    pending_pickups: 0,
    open_reports: 0,
    active_vehicles: 0,
  },
  {
    id: 106,
    code: 'UNION-PATHALIA',
    zone_type: 'union',
    ward_number: null,
    name_bn: 'পাথালিয়া ইউনিয়ন',
    name_en: 'Pathalia Union',
    zone_label_bn: 'পাথালিয়া',
    neighborhoods: ['গেন্ডা সংলগ্ন পাথালিয়া', 'নয়ারহাট', 'বড় ওয়ালিয়া'],
    schedule_bn: 'সকাল ১০:০০ – ১:০০',
    frequency_bn: 'শনি, সোম, বুধ',
    supervisor_name: 'দেওয়ান নাসির',
    supervisor_phone: '01711-000206',
    centroid_lat: 23.91,
    centroid_lng: 90.225,
    pending_pickups: 0,
    open_reports: 0,
    active_vehicles: 0,
  },
];

export const PICKUPS_SEED: PickupRequestRecord[] = [
  {
    id: '22222222-2222-4222-8222-222222222201',
    tracking_code: 'CS-PK-02041',
    citizen_name: 'রাফি আহমেদ',
    citizen_phone: '01715-••••10',
    ward_id: 5,
    ward_name_bn: 'ওয়ার্ড ০৫ — ব্যাংক টাউন ও পাকিজা',
    address_line: 'ব্যাংক টাউন এলাকা (যাচাইকৃত লগইনে পূর্ণ ঠিকানা দৃশ্যমান)',
    landmark: 'ব্যাংক টাউন ১নং গেটের পাশে',
    waste_type: 'household',
    slot: 'morning',
    schedule_type: 'one_time',
    preferred_day: null,
    estimated_bags: 2,
    weight_kg: null,
    status: 'assigned',
    lat: 23.8412,
    lng: 90.2535,
    assigned_vehicle_id: '11111111-1111-4111-8111-111111111102',
    assigned_vehicle_code: 'SV-CMP-01',
    notes: '',
    created_at: new Date(Date.now() - 18 * 60_000).toISOString(),
    updated_at: new Date(Date.now() - 10 * 60_000).toISOString(),
  },
  {
    id: '22222222-2222-4222-8222-222222222202',
    tracking_code: 'CS-PK-02042',
    citizen_name: 'সাদিয়া আফরিন',
    citizen_phone: '01911-••••04',
    ward_id: 4,
    ward_name_bn: 'ওয়ার্ড ০৪ — ব্যাংক কলোনি ও ডগরমোড়া',
    address_line: 'ব্যাংক কলোনি আবাসিক এলাকা',
    landmark: 'ব্যাংক কলোনি জামে মসজিদ থেকে ২০০ মিটার ভেতরে',
    waste_type: 'recyclable',
    slot: 'afternoon',
    schedule_type: 'recurring_weekly',
    preferred_day: 'friday',
    estimated_bags: 3,
    weight_kg: null,
    status: 'pending',
    lat: 23.8458,
    lng: 90.2571,
    assigned_vehicle_id: null,
    assigned_vehicle_code: null,
    notes: '',
    created_at: new Date(Date.now() - 48 * 60_000).toISOString(),
    updated_at: new Date(Date.now() - 48 * 60_000).toISOString(),
  },
];

export const HOTSPOTS_SEED: PublicHotspotRecord[] = [
  {
    id: '33333333-3333-4333-8333-333333333301',
    tracking_code: 'CS-DR-01088',
    ward_id: 3,
    ward_name_bn: 'ওয়ার্ড ০৩ — থানা রোড ও বাজার রোড',
    title_bn: 'থানা রোড কাঁচাবাজার মোড়ে খোলা ময়লার স্তূপ',
    landmark: 'থানা রোড কাঁচাবাজার মোড়ের পশ্চিম পাশে',
    severity: 'critical',
    status: 'verified',
    lat: 23.8492,
    lng: 90.2546,
    duplicate_count: 2,
    cleared_at: null,
    created_at: new Date(Date.now() - 75 * 60_000).toISOString(),
  },
  {
    id: '33333333-3333-4333-8333-333333333302',
    tracking_code: 'CS-DR-01089',
    ward_id: 5,
    ward_name_bn: 'ওয়ার্ড ০৫ — ব্যাংক টাউন ও পাকিজা',
    title_bn: 'পাকিজা ২নং গেট ড্রেন সংযোগ দখল',
    landmark: 'পাকিজা ২নং গেটের সামনে',
    severity: 'high',
    status: 'dispatched',
    lat: 23.8409,
    lng: 90.2528,
    duplicate_count: 1,
    cleared_at: null,
    created_at: new Date(Date.now() - 135 * 60_000).toISOString(),
  },
];

export const REPORTS_SEED: DumpReportRecord[] = HOTSPOTS_SEED.map((h) => ({
  ...h,
  reporter_name: 'সাভারের নাগরিক',
  reporter_phone: '01700-••••00',
  description_bn: 'নাগরিক প্রতিবেদনে জরুরি পরিচ্ছন্নতা প্রয়োজন বলে চিহ্নিত।',
  photo_urls: [],
  resolved_photo_url: null,
  assigned_vehicle_id: h.status === 'dispatched' ? '11111111-1111-4111-8111-111111111102' : null,
  assigned_vehicle_code: h.status === 'dispatched' ? 'SV-CMP-01' : null,
  duplicate_of: null,
  updated_at: h.created_at,
}));

export const VEHICLES_SEED: CollectorVehicleRecord[] = [
  {
    id: '11111111-1111-4111-8111-111111111101',
    code: 'SV-VAN-01',
    vehicle_type: 'rickshaw_van',
    driver_name_bn: 'মো. রফিকুল ইসলাম',
    driver_phone: '01712-448910',
    ward_id: 3,
    ward_name_bn: 'ওয়ার্ড ০৩ — থানা রোড ও বাজার রোড',
    lat: 23.8495,
    lng: 90.2549,
    status: 'available',
    distance_meters: null,
    last_ping_at: new Date(Date.now() - 4 * 60_000).toISOString(),
  },
  {
    id: '11111111-1111-4111-8111-111111111102',
    code: 'SV-CMP-01',
    vehicle_type: 'compactor',
    driver_name_bn: 'মো. কামাল হোসেন',
    driver_phone: '01819-653241',
    ward_id: 5,
    ward_name_bn: 'ওয়ার্ড ০৫ — ব্যাংক টাউন ও পাকিজা',
    lat: 23.8415,
    lng: 90.2538,
    status: 'en_route',
    distance_meters: null,
    last_ping_at: new Date(Date.now() - 2 * 60_000).toISOString(),
  },
  {
    id: '11111111-1111-4111-8111-111111111103',
    code: 'SV-VAN-04',
    vehicle_type: 'rickshaw_van',
    driver_name_bn: 'আবদুল মান্নান',
    driver_phone: '01754-812309',
    ward_id: 4,
    ward_name_bn: 'ওয়ার্ড ০৪ — ব্যাংক কলোনি ও ডগরমোড়া',
    lat: 23.8461,
    lng: 90.2575,
    status: 'available',
    distance_meters: null,
    last_ping_at: new Date(Date.now() - 6 * 60_000).toISOString(),
  },
  {
    id: '11111111-1111-4111-8111-111111111104',
    code: 'SV-TRK-02',
    vehicle_type: 'mini_truck',
    driver_name_bn: 'মো. সোহেল মিয়া',
    driver_phone: '01911-904522',
    ward_id: 8,
    ward_name_bn: 'ওয়ার্ড ০৮ — রাজাশন ও আড়াপাড়া',
    lat: 23.844,
    lng: 90.2681,
    status: 'available',
    distance_meters: null,
    last_ping_at: new Date(Date.now() - 9 * 60_000).toISOString(),
  },
];

export const LOTS_SEED: RecyclableLotRecord[] = [
  {
    id: '44444444-4444-4444-8444-444444444401',
    lot_code: 'CS-LOT-00401',
    ward_id: 5,
    ward_name_bn: 'ওয়ার্ড ০৫ — ব্যাংক টাউন ও পাকিজা',
    material_type: 'plastic',
    estimated_kg: 185.5,
    pickup_hub_bn: 'ব্যাংক টাউন সেকেন্ডারি ট্রান্সফার স্টেশন',
    status: 'open',
    claimed_partner_name: null,
    created_at: new Date(Date.now() - 180 * 60_000).toISOString(),
  },
  {
    id: '44444444-4444-4444-8444-444444444402',
    lot_code: 'CS-LOT-00402',
    ward_id: 3,
    ward_name_bn: 'ওয়ার্ড ০৩ — থানা রোড ও বাজার রোড',
    material_type: 'paper_cardboard',
    estimated_kg: 310.0,
    pickup_hub_bn: 'থানা রোড রিসোর্স কালেকশন পয়েন্ট',
    status: 'claimed',
    claimed_partner_name: 'সবুজ রিসাইক্লিং সাভার',
    created_at: new Date(Date.now() - 240 * 60_000).toISOString(),
  },
  {
    id: '44444444-4444-4444-8444-444444444403',
    lot_code: 'CS-LOT-00403',
    ward_id: 4,
    ward_name_bn: 'ওয়ার্ড ০৪ — ব্যাংক কলোনি ও ডগরমোড়া',
    material_type: 'metal_ewaste',
    estimated_kg: 74.25,
    pickup_hub_bn: 'ব্যাংক কলোনি ওয়ার্ড হাব',
    status: 'open',
    claimed_partner_name: null,
    created_at: new Date(Date.now() - 360 * 60_000).toISOString(),
  },
];

export const ANALYTICS_SEED: AnalyticsSummary = {
  total_pickups: PICKUPS_SEED.length,
  pending_pickups: PICKUPS_SEED.filter((p) =>
    ['pending', 'assigned', 'in_progress'].includes(p.status),
  ).length,
  completed_pickups: PICKUPS_SEED.filter((p) => p.status === 'collected').length,
  total_reports: HOTSPOTS_SEED.length,
  open_reports: HOTSPOTS_SEED.filter((r) =>
    ['reported', 'verified', 'dispatched'].includes(r.status),
  ).length,
  cleared_reports: HOTSPOTS_SEED.filter((r) => r.status === 'cleared').length,
  resolution_rate_percent: 0,
  collected_weight_today_kg: 0,
  active_vehicles: VEHICLES_SEED.filter((v) => v.status !== 'offline').length,
  recyclable_open_kg: LOTS_SEED.filter((l) => l.status === 'open').reduce(
    (sum, l) => sum + l.estimated_kg,
    0,
  ),
};

export const WASTE_TYPE_OPTIONS: { value: WasteType; label: string; hint: string }[] = [
  { value: 'household', label: 'বাসাবাড়ির দৈনন্দিন ময়লা', hint: 'সবুজ + সাধারণ বিন' },
  { value: 'organic', label: 'পচনশীল / রান্নাঘরের বর্জ্য', hint: 'কম্পোস্টযোগ্য জৈব সার' },
  { value: 'recyclable', label: 'রিসাইক্লেবল (প্লাস্টিক/কাগজ/বোতল)', hint: 'শুকনো আলাদা বর্জ্য' },
  { value: 'bulky', label: 'বড় বা ভারী আবর্জনা / গাছের ডাল', hint: 'বিশেষ ভ্যান প্রয়োজন' },
];

export const SLOT_OPTIONS: { value: PickupSlot; label: string; window: string }[] = [
  { value: 'morning', label: 'সকালের শিফট', window: 'সকাল ৭:০০ – ১০:০০' },
  { value: 'afternoon', label: 'দুপুরের শিফট', window: 'দুপুর ২:০০ – ৪:৩০' },
  { value: 'evening', label: 'বিকাল/সন্ধ্যার শিফট', window: 'বিকাল ৫:০০ – ৭:৩০' },
];

export const SCHEDULE_TYPE_OPTIONS: { value: ScheduleType; label: string }[] = [
  { value: 'one_time', label: 'একবার পিকআপ (On-Demand)' },
  { value: 'recurring_weekly', label: 'সাপ্তাহিক নিয়মিত পিকআপ (Weekly)' },
];

export const PREFERRED_DAY_OPTIONS: { value: PreferredDay; label: string }[] = [
  { value: 'saturday', label: 'শনিবার' },
  { value: 'sunday', label: 'রবিবার' },
  { value: 'monday', label: 'সোমবার' },
  { value: 'tuesday', label: 'মঙ্গলবার' },
  { value: 'wednesday', label: 'বুধবার' },
  { value: 'thursday', label: 'বৃহস্পতিবার' },
  { value: 'friday', label: 'শুক্রবার' },
];

export const SEVERITY_OPTIONS: { value: ReportSeverity; label: string; tone: 'neutral' | 'warning' | 'danger' }[] = [
  { value: 'medium', label: 'মাঝারি স্তূপ', tone: 'neutral' },
  { value: 'high', label: 'বেশি — দ্রুত সরানো দরকার', tone: 'warning' },
  { value: 'critical', label: 'জরুরি — রাস্তা/ড্রেন বন্ধ বা ঝুঁকিপূর্ণ', tone: 'danger' },
];

export const PICKUP_STATUS_META: Record<
  PickupStatus,
  { label: string; tone: 'warning' | 'info' | 'success' | 'neutral' | 'danger' }
> = {
  pending: { label: 'অপেক্ষমাণ', tone: 'warning' },
  assigned: { label: 'গাড়ি নির্ধারিত', tone: 'info' },
  in_progress: { label: 'সংগ্রহ চলছে', tone: 'info' },
  collected: { label: 'সংগ্রহ সম্পন্ন', tone: 'success' },
  cancelled: { label: 'বাতিল', tone: 'neutral' },
};

export const REPORT_STATUS_META: Record<
  ReportStatus,
  { label: string; tone: 'warning' | 'info' | 'success' | 'danger' | 'neutral' }
> = {
  reported: { label: 'নতুন অভিযোগ', tone: 'danger' },
  verified: { label: 'যাচাইকৃত', tone: 'warning' },
  dispatched: { label: 'টিম রওনা হয়েছে', tone: 'info' },
  cleared: { label: 'পরিষ্কার হয়েছে', tone: 'success' },
  rejected: { label: 'অগ্রহণযোগ্য', tone: 'neutral' },
};

export const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  rickshaw_van: 'রিকশা ভ্যান',
  mini_truck: 'মিনি ট্রাক',
  compactor: 'কম্প্যাক্টর ট্রাক',
};

export const VEHICLE_STATUS_META: Record<
  VehicleStatus,
  { label: string; tone: 'success' | 'info' | 'warning' | 'neutral' }
> = {
  available: { label: 'প্রস্তুত', tone: 'success' },
  en_route: { label: 'পথে রয়েছে', tone: 'info' },
  busy: { label: 'কাজে ব্যস্ত', tone: 'warning' },
  offline: { label: 'বিরতিতে', tone: 'neutral' },
};

export const MATERIAL_LABELS: Record<MaterialType, string> = {
  plastic: 'প্লাস্টিক ও পিইটি বোতল',
  paper_cardboard: 'কাগজ ও কার্ডবোর্ড',
  metal_ewaste: 'ধাতু ও ই-বর্জ্য',
  glass: 'কাচ ও সিরামিক',
};

export const LOT_STATUS_META: Record<
  LotStatus,
  { label: string; tone: 'success' | 'info' | 'neutral' }
> = {
  open: { label: 'বুকিং খোলা', tone: 'success' },
  claimed: { label: 'পার্টনার বুকড', tone: 'info' },
  collected: { label: 'সংগ্রহ সম্পন্ন', tone: 'neutral' },
};

export interface RecyclingGuideCategory {
  id: 'organic' | 'plastic' | 'paper' | 'hazardous';
  title: string;
  binLabel: string;
  items: string[];
  avoidText: string;
  impactText: string;
}

export const RECYCLING_GUIDE_CATEGORIES: RecyclingGuideCategory[] = [
  {
    id: 'organic',
    title: 'পচনশীল জৈব বর্জ্য',
    binLabel: 'সবুজ বিন (Green Bin)',
    items: [
      'সবজি ও ফলের খোসা এবং রান্নাঘরের অবশিষ্ট খাবার',
      'চা পাতা ও কফির গুঁড়া',
      'বাগানের শুকনো পাতা ও ছোট ডালপালা',
      'বাজারের কাঁচা বর্জ্য ও পচনশীল উপাদান',
    ],
    avoidText: 'পলিথিন ব্যাগ বা প্লাস্টিকের মোড়ক পচনশীল ময়লার সাথে দেবেন না।',
    impactText: 'সাভারের কম্পোস্ট হাবগুলোতে প্রাকৃতিক জৈব সারে রূপান্তরিত হয়।',
  },
  {
    id: 'plastic',
    title: 'শুকনো প্লাস্টিক ও পিইটি',
    binLabel: 'নীল বিন (Blue Bin)',
    items: [
      'পানির বোতল, কোমল পানীয়ের বোতল (PET)',
      'তেল বা শ্যাম্পুর পরিষ্কার ও শুকনো জার',
      'খাবারের প্যাকেট ও শক্ত প্লাস্টিকের পাত্র',
      'ভাঙা বালতি বা প্লাস্টিকের গার্হস্থ্য সামগ্রী',
    ],
    avoidText: 'তরল বা খাবারের উচ্ছিষ্ট লেগে থাকলে পানি দিয়ে ধুয়ে শুকিয়ে নিন।',
    impactText: 'রিসাইক্লিং পার্টনারদের মাধ্যমে পুনর্ব্যবহারযোগ্য দানায় পরিণত হয়।',
  },
  {
    id: 'paper',
    title: 'কাগজ, কার্ডবোর্ড ও ধাতু',
    binLabel: 'হলুদ বিন (Yellow Bin)',
    items: [
      'পুরাতন খবরের কাগজ, বই ও অফিস পেপার',
      'কার্ডবোর্ড কার্টন ও প্যাকেজিং বক্স',
      'অ্যালুমিনিয়াম ক্যান ও লোহার স্ক্র্যাপ',
      'স্বচ্ছ বা রঙিন কাচের বোতল (আলাদা মোড়ানো)',
    ],
    avoidText: 'ভেজা টিস্যু বা তৈলাক্ত খাবারের কাগজ রিসাইক্লেবল কাগজে রাখবেন না।',
    impactText: 'বৈজ্ঞানিক পৃথকীকরণে পরিবেশদূষণ ও ল্যান্ডফিল চাপ কমায়।',
  },
  {
    id: 'hazardous',
    title: 'ব্যাটারি, ই-বর্জ্য ও চিকিৎসা',
    binLabel: 'লাল সতর্কতা ব্যাগ (Red Tag)',
    items: [
      'নষ্ট মোবাইল, চার্জার, সার্কিট ও বৈদ্যুতিক তার',
      'ব্যবহৃত শুকনো ব্যাটারি ও এনার্জি বাল্ব / টিউবলাইট',
      'মেয়াদোত্তীর্ণ ওষুধ ও স্প্রে ক্যান',
      'ধারালো কাচ বা মেডিকেল বর্জ্য (সিল করা বাক্সে)',
    ],
    avoidText: 'সাধারণ ময়লার ভ্যানে কখনোই সরাসরি ধারালো বা রাসায়নিক বর্জ্য ফেলবেন না।',
    impactText: 'বিশেষ সংগ্রহকারী টিমের মাধ্যমে মাটি ও বংশী নদীর পানি দূষণ রোধ করে।',
  },
];

/**
 * Nearest Savar ward fallback by Euclidean square distance when offline.
 */
export function resolveNearestWardLocal(lat: number, lng: number): WardSummary {
  let closest = SAVAR_WARDS_SEED[0]!;
  let minDistSq = Number.POSITIVE_INFINITY;
  for (const w of SAVAR_WARDS_SEED) {
    const dLat = w.centroid_lat - lat;
    const dLng = w.centroid_lng - lng;
    const distSq = dLat * dLat + dLng * dLng;
    if (distSq < minDistSq) {
      minDistSq = distSq;
      closest = w;
    }
  }
  return closest;
}

export const SAVAR_CENTER = {
  lat: 23.8583,
  lng: 90.2667,
} as const;

export const ROLE_LABELS_BN: Record<'citizen' | 'collector' | 'partner' | 'admin', string> = {
  citizen: 'নাগরিক',
  collector: 'সংগ্রহকারী',
  partner: 'রিসাইক্লিং পার্টনার',
  admin: 'পৌর অ্যাডমিন',
};

export const DEMO_OTP_ACCOUNTS: {
  role: 'citizen' | 'collector' | 'partner' | 'admin';
  labelBn: string;
  phone: string;
  nameBn: string;
}[] = [
  { role: 'citizen', labelBn: 'নাগরিক (রাফি)', phone: '01715-883210', nameBn: 'রাফি আহমেদ' },
  { role: 'collector', labelBn: 'সংগ্রহকারী (রফিকুল)', phone: '01712-448910', nameBn: 'মো. রফিকুল ইসলাম' },
  { role: 'partner', labelBn: 'পার্টনার (সবুজ রিসাইক্লিং)', phone: '01755-880001', nameBn: 'সবুজ রিসাইক্লিং সাভার' },
  { role: 'admin', labelBn: 'পৌর অ্যাডমিন', phone: '01711-240100', nameBn: 'সাভার পৌরসভা অ্যাডমিন' },
];
