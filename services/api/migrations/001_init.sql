-- Clean Savar (ক্লিন সাভার) — Core PostGIS Database Schema & Seed Data
-- SRID 4326 (WGS 84) GEOGRAPHY types for exact meter-based geospatial queries.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;

-- Domain Enumerations
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('citizen', 'collector', 'dispatcher', 'admin');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE zone_type AS ENUM ('municipality_ward', 'union');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE pickup_status AS ENUM ('pending', 'assigned', 'in_progress', 'completed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE waste_category AS ENUM ('household', 'organic', 'recyclable', 'hazardous', 'bulky');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE complaint_status AS ENUM ('open', 'in_progress', 'resolved', 'duplicate', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE complaint_category AS ENUM (
        'illegal_dumping',
        'overflowing_bin',
        'blocked_drain',
        'market_waste',
        'construction_debris',
        'hazardous_waste'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE worker_task_type AS ENUM ('pickup', 'complaint');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 1. Savar Service Zones (Pourashava Wards 1-9 & Surrounding Unions)
CREATE TABLE IF NOT EXISTS service_zones (
    id              INTEGER PRIMARY KEY,
    code            VARCHAR(32) NOT NULL UNIQUE,
    name_en         VARCHAR(120) NOT NULL,
    name_bn         TEXT NOT NULL,
    zone_type       zone_type NOT NULL,
    ward_number     SMALLINT,
    boundary        GEOGRAPHY(MultiPolygon, 4326) NOT NULL,
    centroid        GEOGRAPHY(Point, 4326) NOT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_zones_boundary_gist
    ON service_zones USING GIST (boundary);
CREATE INDEX IF NOT EXISTS idx_service_zones_centroid_gist
    ON service_zones USING GIST (centroid);

-- 2. Users (Citizens, Collectors, Dispatchers, Admins)
CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone           VARCHAR(20) NOT NULL UNIQUE,
    full_name       VARCHAR(120) NOT NULL DEFAULT '',
    role            user_role NOT NULL DEFAULT 'citizen',
    ward_id         INTEGER REFERENCES service_zones(id) ON DELETE SET NULL,
    is_verified     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_ward_id ON users (ward_id);

-- 3. Phone OTP Challenges & Auth Sessions
CREATE TABLE IF NOT EXISTS otp_codes (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone           VARCHAR(20) NOT NULL,
    code            VARCHAR(6) NOT NULL,
    attempts        SMALLINT NOT NULL DEFAULT 0,
    expires_at      TIMESTAMPTZ NOT NULL,
    consumed_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otp_codes_phone_created
    ON otp_codes (phone, created_at DESC)
    WHERE consumed_at IS NULL;

CREATE TABLE IF NOT EXISTS auth_sessions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token           VARCHAR(128) NOT NULL UNIQUE,
    expires_at      TIMESTAMPTZ NOT NULL,
    revoked_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id ON auth_sessions (user_id);

-- 4. Waste Collectors / Field Workers
CREATE TABLE IF NOT EXISTS workers (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id          UUID UNIQUE REFERENCES users(id) ON DELETE SET NULL,
    full_name        VARCHAR(120) NOT NULL,
    phone            VARCHAR(20) NOT NULL UNIQUE,
    vehicle_type     VARCHAR(32) NOT NULL DEFAULT 'rickshaw_van'
                     CHECK (vehicle_type IN ('rickshaw_van', 'mini_truck', 'compactor')),
    vehicle_code     VARCHAR(32) NOT NULL UNIQUE,
    ward_id          INTEGER REFERENCES service_zones(id) ON DELETE SET NULL,
    is_online        BOOLEAN NOT NULL DEFAULT FALSE,
    current_location GEOGRAPHY(Point, 4326) NOT NULL,
    last_seen_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workers_current_location_gist
    ON workers USING GIST (current_location);
CREATE INDEX IF NOT EXISTS idx_workers_online_ward
    ON workers (is_online, ward_id)
    WHERE is_online = TRUE;

-- 5. Household Waste Pickup Requests
CREATE TABLE IF NOT EXISTS pickup_requests (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tracking_code         VARCHAR(24) NOT NULL UNIQUE,
    user_id               UUID REFERENCES users(id) ON DELETE SET NULL,
    ward_id               INTEGER NOT NULL REFERENCES service_zones(id),
    assigned_worker_id    UUID REFERENCES workers(id) ON DELETE SET NULL,
    citizen_phone         VARCHAR(20) NOT NULL,
    address               TEXT NOT NULL,
    waste_category        waste_category NOT NULL,
    scheduled_time        TIMESTAMPTZ NOT NULL,
    weight_kg             DOUBLE PRECISION CHECK (weight_kg IS NULL OR weight_kg >= 0),
    status                pickup_status NOT NULL DEFAULT 'pending',
    location              GEOGRAPHY(Point, 4326) NOT NULL,
    notes                 TEXT NOT NULL DEFAULT '',
    completion_photo_url  TEXT,
    completed_at          TIMESTAMPTZ,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pickup_requests_location_gist
    ON pickup_requests USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_pickup_requests_ward_status
    ON pickup_requests (ward_id, status, scheduled_time ASC);
CREATE INDEX IF NOT EXISTS idx_pickup_requests_phone
    ON pickup_requests (citizen_phone);

-- 6. Geo-Tagged Garbage Complaints (with 50m ST_DWithin Duplicate Flagging)
CREATE TABLE IF NOT EXISTS garbage_complaints (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tracking_code         VARCHAR(24) NOT NULL UNIQUE,
    user_id               UUID REFERENCES users(id) ON DELETE SET NULL,
    ward_id               INTEGER NOT NULL REFERENCES service_zones(id),
    assigned_worker_id    UUID REFERENCES workers(id) ON DELETE SET NULL,
    reporter_phone        VARCHAR(20) NOT NULL,
    category              complaint_category NOT NULL,
    description           TEXT NOT NULL DEFAULT '',
    landmark              TEXT NOT NULL DEFAULT '',
    photo_url             TEXT,
    location              GEOGRAPHY(Point, 4326) NOT NULL,
    status                complaint_status NOT NULL DEFAULT 'open',
    duplicate_of          UUID REFERENCES garbage_complaints(id) ON DELETE SET NULL,
    duplicate_count       INTEGER NOT NULL DEFAULT 0,
    resolved_photo_url    TEXT,
    resolved_at           TIMESTAMPTZ,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_garbage_complaints_location_gist
    ON garbage_complaints USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_garbage_complaints_open_location_gist
    ON garbage_complaints USING GIST (location)
    WHERE status IN ('open', 'in_progress') AND duplicate_of IS NULL;
CREATE INDEX IF NOT EXISTS idx_garbage_complaints_ward_status
    ON garbage_complaints (ward_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_garbage_complaints_duplicate_of
    ON garbage_complaints (duplicate_of)
    WHERE duplicate_of IS NOT NULL;

-- 7. Idempotency Store & Collector Completion Audit Log
CREATE TABLE IF NOT EXISTS idempotency_keys (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    idempotency_key       VARCHAR(128) NOT NULL,
    request_scope         VARCHAR(128) NOT NULL,
    request_fingerprint   VARCHAR(128) NOT NULL,
    response_status       SMALLINT,
    response_body         JSONB,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (idempotency_key, request_scope)
);

CREATE TABLE IF NOT EXISTS task_completions (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_type             worker_task_type NOT NULL,
    task_id               UUID NOT NULL,
    worker_id             UUID REFERENCES workers(id) ON DELETE SET NULL,
    idempotency_key       VARCHAR(128) NOT NULL UNIQUE,
    weight_kg             DOUBLE PRECISION,
    photo_url             TEXT,
    notes                 TEXT NOT NULL DEFAULT '',
    completed_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_completions_task
    ON task_completions (task_type, task_id);

-- ============================================================================
-- Seed Data: Savar Municipality Wards (1-9) & Surrounding Savar Unions
-- ============================================================================
INSERT INTO service_zones (id, code, name_en, name_bn, zone_type, ward_number, boundary, centroid)
VALUES
(1, 'WARD-01', 'Ward 1 - Jamsing & Majidpur', 'সাভার পৌরসভা ওয়ার্ড ০১ — জামসিং ও মজিদপুর', 'municipality_ward', 1,
 ST_Multi(ST_GeomFromText('POLYGON((90.258 23.857, 90.271 23.857, 90.271 23.868, 90.258 23.868, 90.258 23.857))', 4326))::geography,
 ST_SetSRID(ST_MakePoint(90.2642, 23.8614), 4326)::geography),
(2, 'WARD-02', 'Ward 2 - Radio Colony & Namabazar', 'সাভার পৌরসভা ওয়ার্ড ০২ — রেডিও কলোনি ও নামা বাজার', 'municipality_ward', 2,
 ST_Multi(ST_GeomFromText('POLYGON((90.253 23.851, 90.264 23.851, 90.264 23.858, 90.253 23.858, 90.253 23.851))', 4326))::geography,
 ST_SetSRID(ST_MakePoint(90.2589, 23.8548), 4326)::geography),
(3, 'WARD-03', 'Ward 3 - Thana Road & Bazar Road', 'সাভার পৌরসভা ওয়ার্ড ০৩ — থানা রোড ও বাজার রোড', 'municipality_ward', 3,
 ST_Multi(ST_GeomFromText('POLYGON((90.249 23.846, 90.258 23.846, 90.258 23.854, 90.249 23.854, 90.249 23.846))', 4326))::geography,
 ST_SetSRID(ST_MakePoint(90.2546, 23.8492), 4326)::geography),
(4, 'WARD-04', 'Ward 4 - Bank Colony & Dogormora', 'সাভার পৌরসভা ওয়ার্ড ০৪ — ব্যাংক কলোনি ও ডগরমোড়া', 'municipality_ward', 4,
 ST_Multi(ST_GeomFromText('POLYGON((90.254 23.843, 90.263 23.843, 90.263 23.851, 90.254 23.851, 90.254 23.843))', 4326))::geography,
 ST_SetSRID(ST_MakePoint(90.2571, 23.8458), 4326)::geography),
(5, 'WARD-05', 'Ward 5 - Bank Town & Pakiza', 'সাভার পৌরসভা ওয়ার্ড ০৫ — ব্যাংক টাউন ও পাকিজা', 'municipality_ward', 5,
 ST_Multi(ST_GeomFromText('POLYGON((90.248 23.838, 90.258 23.838, 90.258 23.846, 90.248 23.846, 90.248 23.838))', 4326))::geography,
 ST_SetSRID(ST_MakePoint(90.2535, 23.8412), 4326)::geography),
(6, 'WARD-06', 'Ward 6 - Genda & Anandapur', 'সাভার পৌরসভা ওয়ার্ড ০৬ — গেন্ডা ও আনন্দপুর', 'municipality_ward', 6,
 ST_Multi(ST_GeomFromText('POLYGON((90.253 23.834, 90.263 23.834, 90.263 23.843, 90.253 23.843, 90.253 23.834))', 4326))::geography,
 ST_SetSRID(ST_MakePoint(90.2568, 23.8375), 4326)::geography),
(7, 'WARD-07', 'Ward 7 - Ulail & Kornapara', 'সাভার পৌরসভা ওয়ার্ড ০৭ — উলাইল ও কর্ণপাড়া', 'municipality_ward', 7,
 ST_Multi(ST_GeomFromText('POLYGON((90.254 23.825, 90.266 23.825, 90.266 23.834, 90.254 23.834, 90.254 23.825))', 4326))::geography,
 ST_SetSRID(ST_MakePoint(90.2591, 23.8304), 4326)::geography),
(8, 'WARD-08', 'Ward 8 - Rajashon & Arapara', 'সাভার পৌরসভা ওয়ার্ড ০৮ — রাজাশন ও আড়াপাড়া', 'municipality_ward', 8,
 ST_Multi(ST_GeomFromText('POLYGON((90.263 23.839, 90.278 23.839, 90.278 23.852, 90.263 23.852, 90.263 23.839))', 4326))::geography,
 ST_SetSRID(ST_MakePoint(90.2688, 23.8436), 4326)::geography),
(9, 'WARD-09', 'Ward 9 - Bhagalpur & Boktarpur', 'সাভার পৌরসভা ওয়ার্ড ০৯ — ভাগলপুর ও বক্তারপুর', 'municipality_ward', 9,
 ST_Multi(ST_GeomFromText('POLYGON((90.241 23.824, 90.253 23.824, 90.253 23.837, 90.241 23.837, 90.241 23.824))', 4326))::geography,
 ST_SetSRID(ST_MakePoint(90.2485, 23.8290), 4326)::geography),
(101, 'UNION-TETULJHORA', 'Tetuljhora Union (Hemayetpur)', 'তেঁতুলঝোড়া ইউনিয়ন (হেমায়েতপুর)', 'union', NULL,
 ST_Multi(ST_GeomFromText('POLYGON((90.255 23.785, 90.285 23.785, 90.285 23.815, 90.255 23.815, 90.255 23.785))', 4326))::geography,
 ST_SetSRID(ST_MakePoint(90.2695, 23.7962), 4326)::geography),
(102, 'UNION-ASHULIA', 'Ashulia Union', 'আশুলিয়া ইউনিয়ন', 'union', NULL,
 ST_Multi(ST_GeomFromText('POLYGON((90.305 23.880, 90.345 23.880, 90.345 23.915, 90.305 23.915, 90.305 23.880))', 4326))::geography,
 ST_SetSRID(ST_MakePoint(90.3264, 23.8968), 4326)::geography),
(103, 'UNION-BIRULIA', 'Birulia Union', 'বিরুলিয়া ইউনিয়ন', 'union', NULL,
 ST_Multi(ST_GeomFromText('POLYGON((90.295 23.845, 90.330 23.845, 90.330 23.880, 90.295 23.880, 90.295 23.845))', 4326))::geography,
 ST_SetSRID(ST_MakePoint(90.3125, 23.8618), 4326)::geography),
(104, 'UNION-AMINBAZAR', 'Aminbazar Union', 'আমিনবাজার ইউনিয়ন', 'union', NULL,
 ST_Multi(ST_GeomFromText('POLYGON((90.305 23.770, 90.340 23.770, 90.340 23.800, 90.305 23.800, 90.305 23.770))', 4326))::geography,
 ST_SetSRID(ST_MakePoint(90.3248, 23.7841), 4326)::geography),
(105, 'UNION-SAVAR-SADAR', 'Savar Sadar Union (Baipail)', 'সাভার সদর ইউনিয়ন (বাইপাইল)', 'union', NULL,
 ST_Multi(ST_GeomFromText('POLYGON((90.250 23.905, 90.285 23.905, 90.285 23.940, 90.250 23.940, 90.250 23.905))', 4326))::geography,
 ST_SetSRID(ST_MakePoint(90.2681, 23.9242), 4326)::geography),
(106, 'UNION-PATHALIA', 'Pathalia Union (Nayarhat)', 'পাথালিয়া ইউনিয়ন (নয়ারহাট)', 'union', NULL,
 ST_Multi(ST_GeomFromText('POLYGON((90.215 23.895, 90.250 23.895, 90.250 23.930, 90.215 23.930, 90.215 23.895))', 4326))::geography,
 ST_SetSRID(ST_MakePoint(90.2338, 23.9145), 4326)::geography)
ON CONFLICT (id) DO NOTHING;

-- Sample Savar Field Collectors (5 online, 1 offline for realistic geospatial testing)
INSERT INTO workers (id, full_name, phone, vehicle_type, vehicle_code, ward_id, is_online, current_location)
VALUES
('11111111-1111-4111-8111-111111111101', 'Md. Rafiqul Islam', '+8801712448910', 'rickshaw_van', 'SV-VAN-01', 3, TRUE,
 ST_SetSRID(ST_MakePoint(90.2549, 23.8495), 4326)::geography),
('11111111-1111-4111-8111-111111111102', 'Md. Kamal Hossain', '+8801819653241', 'compactor', 'SV-CMP-01', 5, TRUE,
 ST_SetSRID(ST_MakePoint(90.2538, 23.8415), 4326)::geography),
('11111111-1111-4111-8111-111111111103', 'Abdul Mannan', '+8801754812309', 'rickshaw_van', 'SV-VAN-04', 4, TRUE,
 ST_SetSRID(ST_MakePoint(90.2575, 23.8461), 4326)::geography),
('11111111-1111-4111-8111-111111111104', 'Md. Sohel Mia', '+8801911904522', 'mini_truck', 'SV-TRK-02', 8, TRUE,
 ST_SetSRID(ST_MakePoint(90.2681, 23.8440), 4326)::geography),
('11111111-1111-4111-8111-111111111105', 'Md. Saiful Islam', '+8801799201487', 'mini_truck', 'SV-TRK-05', 2, TRUE,
 ST_SetSRID(ST_MakePoint(90.2591, 23.8551), 4326)::geography),
('11111111-1111-4111-8111-111111111106', 'Jahangir Alam', '+8801718332760', 'compactor', 'SV-CMP-03', 101, FALSE,
 ST_SetSRID(ST_MakePoint(90.2695, 23.7962), 4326)::geography)
ON CONFLICT (phone) DO NOTHING;
