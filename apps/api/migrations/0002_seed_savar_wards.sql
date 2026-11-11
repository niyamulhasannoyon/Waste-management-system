-- Clean Savar (ক্লিন সাভার) — Canonical Savar Pourashava Wards (1-9) & Unions (101-106)
-- Unified administrative mapping across Backend, Web, and Mobile.

INSERT INTO wards (
    id, code, zone_type, ward_number, name_bn, name_en, zone_label_bn,
    neighborhoods, schedule_bn, frequency_bn, supervisor_name, supervisor_phone,
    boundary, centroid
)
VALUES
(1, 'WARD-01', 'municipality_ward', 1, 'ওয়ার্ড ০১ — জামসিং ও মজিদপুর', 'Ward 1 - Jamsing & Majidpur', 'জামসিং ও মজিদপুর',
 '["জামসিং","উত্তর জামসিং","মজিদপুর"]'::jsonb, 'সকাল ৬:৩০ – ৮:৩০', 'প্রতিদিন', 'মো. আজিজুর রহমান', '01711-240101',
 ST_Multi(ST_GeomFromText('POLYGON((90.258 23.857, 90.271 23.857, 90.271 23.868, 90.258 23.868, 90.258 23.857))', 4326)),
 ST_SetSRID(ST_MakePoint(90.2642, 23.8614), 4326)),

(2, 'WARD-02', 'municipality_ward', 2, 'ওয়ার্ড ০২ — রেডিও কলোনি ও নামা বাজার', 'Ward 2 - Radio Colony & Namabazar', 'রেডিও কলোনি ও নামা বাজার',
 '["রেডিও কলোনি","ভাটপাড়া","নামা বাজার"]'::jsonb, 'সকাল ৭:০০ – ৯:০০', 'প্রতিদিন', 'মো. সেলিম মিয়া', '01711-240102',
 ST_Multi(ST_GeomFromText('POLYGON((90.253 23.851, 90.264 23.851, 90.264 23.858, 90.253 23.858, 90.253 23.851))', 4326)),
 ST_SetSRID(ST_MakePoint(90.2589, 23.8548), 4326)),

(3, 'WARD-03', 'municipality_ward', 3, 'ওয়ার্ড ০৩ — থানা রোড ও বাজার রোড', 'Ward 3 - Thana Road & Bazar Road', 'থানা রোড ও বাজার রোড',
 '["থানা রোড","বাজার রোড","ছায়াবীথি"]'::jsonb, 'সকাল ৬:০০ – ৮:০০ ও বিকাল ৪:৩০', 'দিনে ২ বার', 'মো. রফিকুল ইসলাম', '01711-240103',
 ST_Multi(ST_GeomFromText('POLYGON((90.249 23.846, 90.258 23.846, 90.258 23.854, 90.249 23.854, 90.249 23.846))', 4326)),
 ST_SetSRID(ST_MakePoint(90.2546, 23.8492), 4326)),

(4, 'WARD-04', 'municipality_ward', 4, 'ওয়ার্ড ০৪ — ব্যাংক কলোনি ও ডগরমোড়া', 'Ward 4 - Bank Colony & Dogormora', 'ব্যাংক কলোনি ও ডগরমোড়া',
 '["ব্যাংক কলোনি","ডগরমোড়া","দক্ষিণপাড়া"]'::jsonb, 'সকাল ৭:৩০ – ৯:৩০', 'প্রতিদিন', 'আবদুল মান্নান', '01711-240104',
 ST_Multi(ST_GeomFromText('POLYGON((90.254 23.843, 90.263 23.843, 90.263 23.851, 90.254 23.851, 90.254 23.843))', 4326)),
 ST_SetSRID(ST_MakePoint(90.2571, 23.8458), 4326)),

(5, 'WARD-05', 'municipality_ward', 5, 'ওয়ার্ড ০৫ — ব্যাংক টাউন ও পাকিজা এলাকা', 'Ward 5 - Bank Town & Pakiza', 'ব্যাংক টাউন ও পাকিজা',
 '["ব্যাংক টাউন","পাকিজা এলাকা","তালবাগ"]'::jsonb, 'সকাল ৮:০০ – ১০:০০', 'প্রতিদিন', 'মো. কামাল হোসেন', '01711-240105',
 ST_Multi(ST_GeomFromText('POLYGON((90.248 23.838, 90.258 23.838, 90.258 23.846, 90.248 23.846, 90.248 23.838))', 4326)),
 ST_SetSRID(ST_MakePoint(90.2535, 23.8412), 4326)),

(6, 'WARD-06', 'municipality_ward', 6, 'ওয়ার্ড ০৬ — গেন্ডা ও আনন্দপুর', 'Ward 6 - Genda & Anandapur', 'গেন্ডা ও আনন্দপুর',
 '["গেন্ডা","আনন্দপুর","কাতলাপুর"]'::jsonb, 'সকাল ৮:৩০ – ১০:৩০', 'প্রতিদিন', 'হাবিবুর রহমান', '01711-240106',
 ST_Multi(ST_GeomFromText('POLYGON((90.253 23.834, 90.263 23.834, 90.263 23.843, 90.253 23.843, 90.253 23.834))', 4326)),
 ST_SetSRID(ST_MakePoint(90.2568, 23.8375), 4326)),

(7, 'WARD-07', 'municipality_ward', 7, 'ওয়ার্ড ০৭ — উলাইল ও কর্ণপাড়া', 'Ward 7 - Ulail & Kornapara', 'উলাইল ও কর্ণপাড়া',
 '["উলাইল","কর্ণপাড়া","ইমান্দিপুর"]'::jsonb, 'সকাল ৭:০০ – ৯:৩০', 'প্রতিদিন', 'নজরুল ইসলাম', '01711-240107',
 ST_Multi(ST_GeomFromText('POLYGON((90.254 23.825, 90.266 23.825, 90.266 23.834, 90.254 23.834, 90.254 23.825))', 4326)),
 ST_SetSRID(ST_MakePoint(90.2591, 23.8304), 4326)),

(8, 'WARD-08', 'municipality_ward', 8, 'ওয়ার্ড ০৮ — রাজাশন ও আড়াপাড়া', 'Ward 8 - Rajashon & Arapara', 'রাজাশন ও আড়াপাড়া',
 '["রাজাশন","কমলাপুর","আড়াপাড়া"]'::jsonb, 'সকাল ৯:০০ – ১১:০০', 'প্রতিদিন', 'মো. সোহেল মিয়া', '01711-240108',
 ST_Multi(ST_GeomFromText('POLYGON((90.263 23.839, 90.278 23.839, 90.278 23.852, 90.263 23.852, 90.263 23.839))', 4326)),
 ST_SetSRID(ST_MakePoint(90.2688, 23.8436), 4326)),

(9, 'WARD-09', 'municipality_ward', 9, 'ওয়ার্ড ০৯ — ভাগলপুর ও বক্তারপুর', 'Ward 9 - Bhagalpur & Boktarpur', 'ভাগলপুর ও বক্তারপুর',
 '["ভাগলপুর","বক্তারপুর","দেওগাঁও"]'::jsonb, 'বিকাল ৩:০০ – ৫:০০', 'প্রতিদিন', 'জাকির হোসেন', '01711-240109',
 ST_Multi(ST_GeomFromText('POLYGON((90.241 23.824, 90.253 23.824, 90.253 23.837, 90.241 23.837, 90.241 23.824))', 4326)),
 ST_SetSRID(ST_MakePoint(90.2485, 23.8290), 4326)),

(101, 'UNION-TETULJHORA', 'union', NULL, 'তেঁতুলঝোড়া ইউনিয়ন (হেমায়েতপুর)', 'Tetuljhora Union (Hemayetpur)', 'হেমায়েতপুর ও যাদুরচর',
 '["হেমায়েতপুর","যাদুরচর","শ্যামপুর"]'::jsonb, 'সকাল ৭:৩০ – ১০:৩০', 'প্রতিদিন', 'জাহাঙ্গীর আলম', '01711-240201',
 ST_Multi(ST_GeomFromText('POLYGON((90.255 23.785, 90.285 23.785, 90.285 23.815, 90.255 23.815, 90.255 23.785))', 4326)),
 ST_SetSRID(ST_MakePoint(90.2695, 23.7962), 4326)),

(102, 'UNION-ASHULIA', 'union', NULL, 'আশুলিয়া ইউনিয়ন', 'Ashulia Union', 'আশুলিয়া বাজার ও জিরাবো',
 '["আশুলিয়া বাজার","জিরাবো","ঘোষবাগ"]'::jsonb, 'সকাল ৮:০০ – ১১:০০', 'শনি, সোম, বুধ', 'তারেক মাহমুদ', '01711-240202',
 ST_Multi(ST_GeomFromText('POLYGON((90.305 23.880, 90.345 23.880, 90.345 23.915, 90.305 23.915, 90.305 23.880))', 4326)),
 ST_SetSRID(ST_MakePoint(90.3264, 23.8968), 4326)),

(103, 'UNION-BIRULIA', 'union', NULL, 'বিরুলিয়া ইউনিয়ন', 'Birulia Union', 'বিরুলিয়া ও আকরাইন',
 '["বিরুলিয়া বাজার","আকরাইন","খাগান"]'::jsonb, 'সকাল ৯:০০ – ১২:০০', 'রবি, মঙ্গল, বৃহস্পতি', 'মো. ফরিদ উদ্দিন', '01711-240203',
 ST_Multi(ST_GeomFromText('POLYGON((90.295 23.845, 90.330 23.845, 90.330 23.880, 90.295 23.880, 90.295 23.845))', 4326)),
 ST_SetSRID(ST_MakePoint(90.3125, 23.8618), 4326)),

(104, 'UNION-AMINBAZAR', 'union', NULL, 'আমিনবাজার ইউনিয়ন', 'Aminbazar Union', 'আমিনবাজার ও বড়দেশী',
 '["আমিনবাজার","বড়দেশী","সালেহপুর"]'::jsonb, 'সকাল ৬:৩০ – ৯:০০', 'প্রতিদিন', 'শাহাদাত হোসেন', '01711-240204',
 ST_Multi(ST_GeomFromText('POLYGON((90.305 23.770, 90.340 23.770, 90.340 23.800, 90.305 23.800, 90.305 23.770))', 4326)),
 ST_SetSRID(ST_MakePoint(90.3248, 23.7841), 4326)),

(105, 'UNION-SAVAR-SADAR', 'union', NULL, 'সাভার সদর ইউনিয়ন (বাইপাইল)', 'Savar Sadar Union (Baipail)', 'বাইপাইল ও ডেন্ডাবর',
 '["বাইপাইল","ডেন্ডাবর","পলাশবাড়ি"]'::jsonb, 'সকাল ৮:০০ – ১১:০০', 'প্রতিদিন', 'ইব্রাহিম খলিল', '01711-240205',
 ST_Multi(ST_GeomFromText('POLYGON((90.250 23.905, 90.285 23.905, 90.285 23.940, 90.250 23.940, 90.250 23.905))', 4326)),
 ST_SetSRID(ST_MakePoint(90.2681, 23.9242), 4326)),

(106, 'UNION-PATHALIA', 'union', NULL, 'পাথালিয়া ইউনিয়ন (নয়ারহাট)', 'Pathalia Union (Nayarhat)', 'নয়ারহাট ও পাথালিয়া',
 '["নয়ারহাট","পাথালিয়া","পানধোয়া"]'::jsonb, 'দুপুর ২:০০ – ৫:০০', 'শনি, সোম, বুধ', 'লুৎফর রহমান', '01711-240206',
 ST_Multi(ST_GeomFromText('POLYGON((90.215 23.895, 90.250 23.895, 90.250 23.930, 90.215 23.930, 90.215 23.895))', 4326)),
 ST_SetSRID(ST_MakePoint(90.2338, 23.9145), 4326))
ON CONFLICT (id) DO UPDATE SET
    code = EXCLUDED.code,
    zone_type = EXCLUDED.zone_type,
    ward_number = EXCLUDED.ward_number,
    name_bn = EXCLUDED.name_bn,
    name_en = EXCLUDED.name_en,
    zone_label_bn = EXCLUDED.zone_label_bn,
    neighborhoods = EXCLUDED.neighborhoods,
    schedule_bn = EXCLUDED.schedule_bn,
    frequency_bn = EXCLUDED.frequency_bn,
    supervisor_name = EXCLUDED.supervisor_name,
    supervisor_phone = EXCLUDED.supervisor_phone,
    boundary = EXCLUDED.boundary,
    centroid = EXCLUDED.centroid;

-- Seed Demo Users (authenticate strictly via OTP challenge — no bypass tokens)
INSERT INTO users (id, phone, full_name, role, ward_id, is_verified)
VALUES
('aaaa1111-1111-4111-8111-111111111101', '01711-240100', 'সাভার পৌরসভা অ্যাডমিন', 'admin', 3, TRUE),
('aaaa1111-1111-4111-8111-111111111102', '01712-448910', 'মো. রফিকুল ইসলাম', 'collector', 3, TRUE),
('aaaa1111-1111-4111-8111-111111111103', '01819-653241', 'মো. কামাল হোসেন', 'collector', 5, TRUE),
('aaaa1111-1111-4111-8111-111111111104', '01754-812309', 'আবদুল মান্নান', 'collector', 4, TRUE),
('aaaa1111-1111-4111-8111-111111111105', '01911-904522', 'মো. সোহেল মিয়া', 'collector', 8, TRUE),
('aaaa1111-1111-4111-8111-111111111106', '01755-880001', 'সবুজ রিসাইক্লিং সাভার', 'partner', 5, TRUE),
('aaaa1111-1111-4111-8111-111111111107', '01715-883210', 'রাফি আহমেদ', 'citizen', 5, TRUE)
ON CONFLICT (phone) DO NOTHING;

-- Seed Verified Recycling Partner
INSERT INTO partners (id, user_id, organization_name, contact_phone, ward_id, is_verified)
VALUES
('bbbb1111-1111-4111-8111-111111111101', 'aaaa1111-1111-4111-8111-111111111106', 'সবুজ রিসাইক্লিং সাভার', '01755-880001', 5, TRUE)
ON CONFLICT (contact_phone) DO NOTHING;

-- Seed Collector Vehicles linked to Collector User Accounts
INSERT INTO collector_vehicles (id, user_id, code, vehicle_type, driver_name_bn, driver_phone, ward_id, current_location, status)
VALUES
('11111111-1111-4111-8111-111111111101', 'aaaa1111-1111-4111-8111-111111111102', 'SV-VAN-01', 'rickshaw_van', 'মো. রফিকুল ইসলাম', '01712-448910', 3, ST_SetSRID(ST_MakePoint(90.2549, 23.8495), 4326), 'available'),
('11111111-1111-4111-8111-111111111102', 'aaaa1111-1111-4111-8111-111111111103', 'SV-CMP-01', 'compactor', 'মো. কামাল হোসেন', '01819-653241', 5, ST_SetSRID(ST_MakePoint(90.2538, 23.8415), 4326), 'en_route'),
('11111111-1111-4111-8111-111111111103', 'aaaa1111-1111-4111-8111-111111111104', 'SV-VAN-04', 'rickshaw_van', 'আবদুল মান্নান', '01754-812309', 4, ST_SetSRID(ST_MakePoint(90.2575, 23.8461), 4326), 'available'),
('11111111-1111-4111-8111-111111111104', 'aaaa1111-1111-4111-8111-111111111105', 'SV-TRK-02', 'mini_truck', 'মো. সোহেল মিয়া', '01911-904522', 8, ST_SetSRID(ST_MakePoint(90.2681, 23.8440), 4326), 'available'),
('11111111-1111-4111-8111-111111111105', NULL, 'SV-CMP-03', 'compactor', 'জাহাঙ্গীর আলম', '01718-332760', 101, ST_SetSRID(ST_MakePoint(90.2695, 23.7962), 4326), 'offline')
ON CONFLICT (code) DO NOTHING;

-- Sample Pickup Requests (using canonical Wards 1-9 & Unions)
INSERT INTO pickup_requests (
    id, tracking_code, user_id, citizen_name, citizen_phone, ward_id,
    address_line, landmark, waste_type, slot, schedule_type, estimated_bags,
    status, location, assigned_vehicle_id, notes
)
VALUES
('22222222-2222-4222-8222-222222222201', 'CS-PK-02041', 'aaaa1111-1111-4111-8111-111111111107', 'রাফি আহমেদ', '01715-883210', 5,
 'বাসা ১৪, রোড ২, ব্যাংক টাউন', 'ব্যাংক টাউন ১নং গেটের পাশে', 'household', 'morning', 'one_time', 2,
 'assigned', ST_SetSRID(ST_MakePoint(90.2535, 23.8412), 4326), '11111111-1111-4111-8111-111111111102', 'গেটের দারোয়ানের কাছে রাখা আছে'),

('22222222-2222-4222-8222-222222222202', 'CS-PK-02042', NULL, 'সাদিয়া আফরিন', '01911-552104', 4,
 'বাড়ি ৮/বি, ব্যাংক কলোনি আবাসিক এলাকা', 'ব্যাংক কলোনি জামে মসজিদ থেকে ২০০ মিটার ভেতরে', 'recyclable', 'afternoon', 'recurring_weekly', 3,
 'pending', ST_SetSRID(ST_MakePoint(90.2571, 23.8458), 4326), NULL, 'প্লাস্টিক বোতল ও কার্টন আলাদা করা আছে'),

('22222222-2222-4222-8222-222222222203', 'CS-PK-02043', NULL, 'রাকিবুল হাসান', '01674-902311', 3,
 'দোকান ১২, সাভার সিটি সেন্টার সংলগ্ন', 'থানা রোড কাঁচাবাজার মোড়', 'organic', 'evening', 'one_time', 4,
 'collected', ST_SetSRID(ST_MakePoint(90.2546, 23.8492), 4326), '11111111-1111-4111-8111-111111111101', 'সবজি ও কাঁচাবাজারের বর্জ্য')
ON CONFLICT (tracking_code) DO NOTHING;

-- Sample Geo-Tagged Dump Reports (no invalid local file URLs)
INSERT INTO dump_reports (
    id, tracking_code, user_id, reporter_name, reporter_phone, ward_id,
    title_bn, description_bn, landmark, severity, status, location,
    photo_urls, assigned_vehicle_id, cleared_at
)
VALUES
('33333333-3333-4333-8333-333333333301', 'CS-DR-01088', NULL, 'মাহবুব আলম', '01722-419022', 3,
 'থানা রোড কাঁচাবাজার মোড়ে খোলা ময়লার স্তূপ', 'দুই দিন ধরে বাজারের পচা সবজি ও পলিথিন জমে দুর্গন্ধ ছড়াচ্ছে।',
 'থানা রোড কাঁচাবাজার মোড়ের পশ্চিম পাশে', 'critical', 'verified', ST_SetSRID(ST_MakePoint(90.2546, 23.8492), 4326), '[]'::jsonb, NULL, NULL),

('33333333-3333-4333-8333-333333333302', 'CS-DR-01089', NULL, 'তাসনিম তাবাসসুম', '01833-774512', 5,
 'পাকিজা ২নং গেট ড্রেন সংযোগ দখল', 'প্লাস্টিকের বোতল ও ওয়ান-টাইম কাপ জমে ড্রেনের মুখ বন্ধ হয়ে আছে।',
 'পাকিজা ২নং গেটের সামনে', 'high', 'dispatched', ST_SetSRID(ST_MakePoint(90.2528, 23.8409), 4326), '[]'::jsonb, '11111111-1111-4111-8111-111111111102', NULL),

('33333333-3333-4333-8333-333333333303', 'CS-DR-01090', NULL, 'নুসরাত জাহান', '01798-330918', 6,
 'গেন্ডা পুকুরপাড়ে আবর্জনা', 'রাতের বেলা কেউ নির্মাণ বর্জ্য ও বস্তা ফেলে গেছে।',
 'গেন্ডা বাসস্ট্যান্ড সংলগ্ন পুকুরপাড় মোড়', 'medium', 'cleared', ST_SetSRID(ST_MakePoint(90.2568, 23.8375), 4326), '[]'::jsonb, '11111111-1111-4111-8111-111111111101', NOW())
ON CONFLICT (tracking_code) DO NOTHING;

-- Sample Recyclable Lots
INSERT INTO recyclable_lots (
    id, lot_code, ward_id, material_type, estimated_kg, pickup_hub_bn,
    status, claimed_partner_id, claimed_partner_name
)
VALUES
('44444444-4444-4444-8444-444444444401', 'CS-LOT-00401', 5, 'plastic', 185.50, 'ব্যাংক টাউন সেকেন্ডারি ট্রান্সফার স্টেশন', 'open', NULL, NULL),
('44444444-4444-4444-8444-444444444402', 'CS-LOT-00402', 3, 'paper_cardboard', 310.00, 'থানা রোড রিসোর্স কালেকশন পয়েন্ট', 'claimed', 'bbbb1111-1111-4111-8111-111111111101', 'সবুজ রিসাইক্লিং সাভার'),
('44444444-4444-4444-8444-444444444403', 'CS-LOT-00403', 4, 'metal_ewaste', 74.25, 'ব্যাংক কলোনি ওয়ার্ড হাব', 'open', NULL, NULL)
ON CONFLICT (lot_code) DO NOTHING;

-- Seed initial status audit events matching seeded entities
INSERT INTO status_events (id, entity_type, entity_id, pickup_id, from_status, to_status, actor_label, note_bn)
VALUES
('66666666-6666-4666-8666-666666666601', 'pickup', '22222222-2222-4222-8222-222222222201', '22222222-2222-4222-8222-222222222201', NULL, 'pending', 'রাফি আহমেদ', 'নাগরিকের পিকআপ রিকোয়েস্ট গ্রহণ করা হয়েছে'),
('66666666-6666-4666-8666-666666666602', 'pickup', '22222222-2222-4222-8222-222222222201', '22222222-2222-4222-8222-222222222201', 'pending', 'assigned', 'সাভার পৌরসভা অপস', 'কম্প্যাক্টর SV-CMP-01 নির্ধারণ করা হয়েছে')
ON CONFLICT (id) DO NOTHING;

INSERT INTO status_events (id, entity_type, entity_id, dump_report_id, from_status, to_status, actor_label, note_bn)
VALUES
('66666666-6666-4666-8666-666666666603', 'dump_report', '33333333-3333-4333-8333-333333333301', '33333333-3333-4333-8333-333333333301', NULL, 'reported', 'মাহবুব আলম', 'ছবি ও লোকেশনসহ ময়লার রিপোর্ট জমা হয়েছে'),
('66666666-6666-4666-8666-666666666604', 'dump_report', '33333333-3333-4333-8333-333333333301', '33333333-3333-4333-8333-333333333301', 'reported', 'verified', 'সাভার পৌরসভা অপস', 'হটস্পট যাচাই সম্পন্ন হয়েছে'),
('66666666-6666-4666-8666-666666666605', 'dump_report', '33333333-3333-4333-8333-333333333303', '33333333-3333-4333-8333-333333333303', NULL, 'reported', 'নুসরাত জাহান', 'ছবি ও লোকেশনসহ ময়লার রিপোর্ট জমা হয়েছে'),
('66666666-6666-4666-8666-666666666606', 'dump_report', '33333333-3333-4333-8333-333333333303', '33333333-3333-4333-8333-333333333303', 'reported', 'cleared', 'মাঠপর্যায় সংগ্রহকারী', 'গেন্ডা পুকুরপাড় পরিষ্কার সম্পন্ন হয়েছে')
ON CONFLICT (id) DO NOTHING;

-- Seed realistic citizen notifications
INSERT INTO notifications (id, user_id, title_bn, body_bn, entity_type, entity_id)
VALUES
('55555555-5555-4555-8555-555555555501', 'aaaa1111-1111-4111-8111-111111111107', 'কালেক্টর নির্ধারিত হয়েছে', 'আপনার পিকআপ CS-PK-02041 এর জন্য SV-CMP-01 নির্ধারণ করা হয়েছে।', 'pickup', '22222222-2222-4222-8222-222222222201')
ON CONFLICT (id) DO NOTHING;
