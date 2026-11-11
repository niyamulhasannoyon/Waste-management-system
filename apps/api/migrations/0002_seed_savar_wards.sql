-- Savar Pourashava Wards 1-9 & Priority Service Zones Seed Data
-- Approximate bounding polygons centered around Savar (23.840–23.895 N, 90.240–90.285 E)

INSERT INTO wards (id, code, name_bn, name_en, zone_label_bn, supervisor_name, supervisor_phone, boundary, centroid)
VALUES
(1, 'WARD-01', 'ওয়ার্ড ১ — গেন্ডা ও থানা স্ট্যান্ড', 'Ward 1 - Genda & Thana Stand', 'থানা স্ট্যান্ড', 'মোঃ রফিকুল ইসলাম', '01711-240101',
 ST_Multi(ST_GeomFromText('POLYGON((90.252 23.840, 90.264 23.840, 90.264 23.850, 90.252 23.850, 90.252 23.840))', 4326)),
 ST_SetSRID(ST_MakePoint(90.258, 23.845), 4326)),
(2, 'WARD-02', 'ওয়ার্ড ২ — সাভার বাজার ও নয়া বাজার', 'Ward 2 - Savar Bazar', 'সাভার বাজার', 'আব্দুল করিম', '01711-240102',
 ST_Multi(ST_GeomFromText('POLYGON((90.250 23.850, 90.260 23.850, 90.260 23.860, 90.250 23.860, 90.250 23.850))', 4326)),
 ST_SetSRID(ST_MakePoint(90.255, 23.855), 4326)),
(3, 'WARD-03', 'ওয়ার্ড ৩ — ব্যাংক টাউন ও নামা বাজার', 'Ward 3 - Bank Town', 'ব্যাংক টাউন', 'নাজমুল হক', '01711-240103',
 ST_Multi(ST_GeomFromText('POLYGON((90.260 23.850, 90.272 23.850, 90.272 23.860, 90.260 23.860, 90.260 23.850))', 4326)),
 ST_SetSRID(ST_MakePoint(90.266, 23.855), 4326)),
(4, 'WARD-04', 'ওয়ার্ড ৪ — সিআরপি রোড ও ছায়াবিথী', 'Ward 4 - CRP Road & Chhayabithi', 'সিআরপি রোড', 'ফারহানা আক্তার', '01711-240104',
 ST_Multi(ST_GeomFromText('POLYGON((90.252 23.860, 90.265 23.860, 90.265 23.870, 90.252 23.870, 90.252 23.860))', 4326)),
 ST_SetSRID(ST_MakePoint(90.258, 23.865), 4326)),
(5, 'WARD-05', 'ওয়ার্ড ৫ — রেডিও কলোনি ও উলাইল', 'Ward 5 - Radio Colony & Ulail', 'রেডিও কলোনি', 'কামরুল হাসান', '01711-240105',
 ST_Multi(ST_GeomFromText('POLYGON((90.265 23.840, 90.278 23.840, 90.278 23.852, 90.265 23.852, 90.265 23.840))', 4326)),
 ST_SetSRID(ST_MakePoint(90.271, 23.846), 4326)),
(6, 'WARD-06', 'ওয়ার্ড ৬ — তালবাগ ও আড়াপাড়া', 'Ward 6 - Talbag & Arapara', 'তালবাগ', 'শাহীন আলম', '01711-240106',
 ST_Multi(ST_GeomFromText('POLYGON((90.242 23.852, 90.252 23.852, 90.252 23.866, 90.242 23.866, 90.242 23.852))', 4326)),
 ST_SetSRID(ST_MakePoint(90.247, 23.859), 4326)),
(7, 'WARD-07', 'ওয়ার্ড ৭ — রাজাশন ও কর্ণপাড়া', 'Ward 7 - Rajashon & Kornapara', 'রাজাশন', 'জাহাঙ্গীর কবির', '01711-240107',
 ST_Multi(ST_GeomFromText('POLYGON((90.265 23.860, 90.280 23.860, 90.280 23.874, 90.265 23.874, 90.265 23.860))', 4326)),
 ST_SetSRID(ST_MakePoint(90.272, 23.867), 4326)),
(8, 'WARD-08', 'ওয়ার্ড ৮ — ডগরমোড়া ও জামসিং', 'Ward 8 - Dogormora & Jamsing', 'ডগরমোড়া', 'সোহেল রানা', '01711-240108',
 ST_Multi(ST_GeomFromText('POLYGON((90.252 23.870, 90.266 23.870, 90.266 23.884, 90.252 23.884, 90.252 23.870))', 4326)),
 ST_SetSRID(ST_MakePoint(90.259, 23.877), 4326)),
(9, 'WARD-09', 'ওয়ার্ড ৯ — জাহাঙ্গীরনগর সংলগ্ন ও ইসলামনগর', 'Ward 9 - JU Gate & Islamnagar', 'ইসলামনগর', 'মাহমুদুর রহমান', '01711-240109',
 ST_Multi(ST_GeomFromText('POLYGON((90.266 23.874, 90.282 23.874, 90.282 23.892, 90.266 23.892, 90.266 23.874))', 4326)),
 ST_SetSRID(ST_MakePoint(90.274, 23.883), 4326))
ON CONFLICT (id) DO NOTHING;

-- Collector Vehicles
INSERT INTO collector_vehicles (id, code, vehicle_type, driver_name_bn, driver_phone, ward_id, current_location, status)
VALUES
('11111111-1111-1111-1111-111111111101', 'SV-VAN-01', 'rickshaw_van', 'মোঃ সুমন মিয়া', '01812-101001', 1, ST_SetSRID(ST_MakePoint(90.2575, 23.8458), 4326), 'available'),
('11111111-1111-1111-1111-111111111102', 'SV-VAN-04', 'rickshaw_van', 'মোঃ আলমগীর', '01812-101002', 3, ST_SetSRID(ST_MakePoint(90.2658, 23.8554), 4326), 'en_route'),
('11111111-1111-1111-1111-111111111103', 'SV-TRK-02', 'mini_truck', 'মোঃ হানিফ শেখ', '01812-101003', 2, ST_SetSRID(ST_MakePoint(90.2548, 23.8549), 4326), 'available'),
('11111111-1111-1111-1111-111111111104', 'SV-VAN-07', 'rickshaw_van', 'মোঃ জসিম উদ্দিন', '01812-101004', 4, ST_SetSRID(ST_MakePoint(90.2591, 23.8648), 4326), 'available'),
('11111111-1111-1111-1111-111111111105', 'SV-CMP-01', 'compactor', 'মোঃ বোরহান', '01812-101005', 5, ST_SetSRID(ST_MakePoint(90.2705, 23.8465), 4326), 'busy')
ON CONFLICT (code) DO NOTHING;

-- Sample Pickup Requests
INSERT INTO pickup_requests (id, tracking_code, citizen_name, citizen_phone, ward_id, address_line, landmark, waste_type, slot, estimated_bags, status, location, assigned_vehicle_id, notes)
VALUES
('22222222-2222-2222-2222-222222222201', 'CS-PK-2041', 'তানভীর আহমেদ', '01715-883210', 3, 'বাসা ১৪, রোড ২, ব্যাংক টাউন', 'ব্যাংক টাউন মসজিদের পাশে', 'household', 'morning', 2, 'assigned', ST_SetSRID(ST_MakePoint(90.2662, 23.8558), 4326), '11111111-1111-1111-1111-111111111102', 'গেটের দারোয়ানের কাছে রাখা আছে'),
('22222222-2222-2222-2222-222222222202', 'CS-PK-2042', 'সাদিয়া আফরিন', '01911-552104', 4, 'বাড়ি ৮/বি, ছায়াবিথী আবাসিক এলাকা', 'সিআরপি মেইন গেট থেকে ৩০০ মিটার ভেতরে', 'recyclable', 'afternoon', 3, 'pending', ST_SetSRID(ST_MakePoint(90.2584, 23.8642), 4326), NULL, 'প্লাস্টিক বোতল ও কার্টন আলাদা করা আছে'),
('22222222-2222-2222-2222-222222222203', 'CS-PK-2043', 'রাকিবুল হাসান', '01674-902311', 2, 'দোকান ১২, সাভার সিটি সেন্টার সংলগ্ন', 'সাভার বাজার বড় মসজিদ রোড', 'organic', 'evening', 4, 'collected', ST_SetSRID(ST_MakePoint(90.2552, 23.8543), 4326), '11111111-1111-1111-1111-111111111103', 'সবজি ও কাঁচাবাজারের বর্জ্য')
ON CONFLICT (tracking_code) DO NOTHING;

-- Sample Geo-Tagged Dump Reports
INSERT INTO dump_reports (id, tracking_code, reporter_name, reporter_phone, ward_id, title_bn, description_bn, landmark, severity, status, location, photo_urls, assigned_vehicle_id)
VALUES
('33333333-3333-3333-3333-333333333301', 'CS-DR-1088', 'মাহবুব আলম', '01722-419022', 2, 'নয়া বাজার গলির মুখে খোলা ময়লার স্তূপ', 'দুই দিন ধরে বাজারের পচা সবজি ও পলিথিন জমে দুর্গন্ধ ছড়াচ্ছে।', 'সাভার বাজার ওভারব্রিজের উত্তর পাশের গলি', 'critical', 'verified', ST_SetSRID(ST_MakePoint(90.2561, 23.8562), 4326), '["/sample/dump-nayabazar.jpg"]'::jsonb, NULL),
('33333333-3333-3333-3333-333333333302', 'CS-DR-1089', 'তাসনিম তাবাসসুম', '01833-774512', 5, 'রেডিও কলোনি বাস স্ট্যান্ড সংলগ্ন ড্রেন দখল', 'প্লাস্টিক ও ওয়ান-টাইম কাপ পড়ে ড্রেনের মুখ বন্ধ হয়ে আছে।', 'রেডিও কলোনি ফুটওভার ব্রিজের নিচে', 'high', 'dispatched', ST_SetSRID(ST_MakePoint(90.2712, 23.8468), 4326), '["/sample/dump-radiocolony.jpg"]'::jsonb, '11111111-1111-1111-1111-111111111105'),
('33333333-3333-3333-3333-333333333303', 'CS-DR-1090', 'নুসরাত জাহান', '01798-330918', 1, 'থানা স্ট্যান্ড পুকুরপাড়ে আবর্জনা', 'রাতের বেলা কেউ নির্মাণ বর্জ্য ও বস্তা ফেলে গেছে।', 'গেন্ডা পুকুরপাড় মোড়', 'medium', 'cleared', ST_SetSRID(ST_MakePoint(90.2582, 23.8449), 4326), '["/sample/dump-genda.jpg"]'::jsonb, '11111111-1111-1111-1111-111111111101')
ON CONFLICT (tracking_code) DO NOTHING;

-- Sample Recyclable Lots for Partner Portal
INSERT INTO recyclable_lots (lot_code, ward_id, material_type, estimated_kg, pickup_hub_bn, status, claimed_partner_name)
VALUES
('CS-LOT-401', 3, 'plastic', 185.50, 'ব্যাংক টাউন সেকেন্ডারি ট্রান্সফার স্টেশন', 'open', NULL),
('CS-LOT-402', 2, 'paper_cardboard', 310.00, 'সাভার বাজার কালেকশন পয়েন্ট', 'claimed', 'সবুজ রিসাইক্লিং সাভার'),
('CS-LOT-403', 4, 'metal_ewaste', 74.25, 'সিআরপি রোড ওয়ার্ড হাব', 'open', NULL)
ON CONFLICT (lot_code) DO NOTHING;
