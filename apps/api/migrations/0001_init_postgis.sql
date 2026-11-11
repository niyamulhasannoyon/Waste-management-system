-- Clean Savar (ক্লিন সাভার) — Unified PostGIS Geospatial & Operations Schema
-- SRID 4326 (WGS 84) is used for all GPS coordinates and Savar ward/union boundaries.

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Collision-free sequences for citizen-facing tracking codes and lot codes
CREATE SEQUENCE IF NOT EXISTS pickup_tracking_seq START WITH 2100 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS report_tracking_seq START WITH 1200 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS lot_code_seq START WITH 410 INCREMENT BY 1;

-- 1. Savar Pourashava Wards (1-9) & Surrounding Unions (101-106)
CREATE TABLE IF NOT EXISTS wards (
    id                SMALLINT PRIMARY KEY,
    code              VARCHAR(32) NOT NULL UNIQUE,
    zone_type         VARCHAR(24) NOT NULL CHECK (zone_type IN ('municipality_ward', 'union')),
    ward_number       SMALLINT,
    name_bn           TEXT NOT NULL,
    name_en           TEXT NOT NULL,
    zone_label_bn     TEXT NOT NULL,
    neighborhoods     JSONB NOT NULL DEFAULT '[]'::jsonb,
    schedule_bn       TEXT NOT NULL DEFAULT 'সকাল ৭:০০ – ১০:০০',
    frequency_bn      TEXT NOT NULL DEFAULT 'প্রতিদিন',
    supervisor_name   TEXT NOT NULL,
    supervisor_phone  VARCHAR(20) NOT NULL,
    boundary          GEOMETRY(MultiPolygon, 4326) NOT NULL,
    centroid          GEOMETRY(Point, 4326) NOT NULL,
    is_active         BOOLEAN NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wards_boundary_gist ON wards USING GIST (boundary);
CREATE INDEX IF NOT EXISTS idx_wards_centroid_gist ON wards USING GIST (centroid);
CREATE INDEX IF NOT EXISTS idx_wards_type_active ON wards (zone_type, is_active, ward_number);

-- 2. Authenticated Users (Citizen, Collector, Partner, Admin)
CREATE TABLE IF NOT EXISTS users (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone             VARCHAR(20) NOT NULL UNIQUE,
    full_name         VARCHAR(120) NOT NULL DEFAULT '',
    role              VARCHAR(24) NOT NULL DEFAULT 'citizen'
                      CHECK (role IN ('citizen', 'collector', 'partner', 'admin')),
    ward_id           SMALLINT REFERENCES wards(id) ON DELETE SET NULL,
    is_verified       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);
CREATE INDEX IF NOT EXISTS idx_users_ward_id ON users (ward_id);

-- 3. Hashed Phone OTP Challenges (no plaintext OTPs, rate-limit friendly)
CREATE TABLE IF NOT EXISTS otp_codes (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone              VARCHAR(20) NOT NULL,
    otp_hash           VARCHAR(64) NOT NULL,
    pending_full_name  VARCHAR(120),
    pending_ward_id    SMALLINT REFERENCES wards(id) ON DELETE SET NULL,
    pending_role       VARCHAR(24) CHECK (pending_role IS NULL OR pending_role IN ('citizen', 'collector')),
    attempts           SMALLINT NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    expires_at         TIMESTAMPTZ NOT NULL,
    consumed_at        TIMESTAMPTZ,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otp_codes_phone_created ON otp_codes (phone, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_otp_codes_expires_at ON otp_codes (expires_at);

-- 4. Hashed Bearer Sessions
CREATE TABLE IF NOT EXISTS auth_sessions (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash         VARCHAR(64) NOT NULL UNIQUE,
    expires_at         TIMESTAMPTZ NOT NULL,
    revoked_at         TIMESTAMPTZ,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id ON auth_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires_at ON auth_sessions (expires_at);

-- 5. Verified Recycling Partners
CREATE TABLE IF NOT EXISTS partners (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id            UUID UNIQUE REFERENCES users(id) ON DELETE SET NULL,
    organization_name  VARCHAR(160) NOT NULL UNIQUE,
    contact_phone      VARCHAR(20) NOT NULL UNIQUE,
    ward_id            SMALLINT REFERENCES wards(id) ON DELETE SET NULL,
    is_verified        BOOLEAN NOT NULL DEFAULT TRUE,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Collector Vehicles & Field Workers
CREATE TABLE IF NOT EXISTS collector_vehicles (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id            UUID UNIQUE REFERENCES users(id) ON DELETE SET NULL,
    code               VARCHAR(32) NOT NULL UNIQUE,
    vehicle_type       VARCHAR(24) NOT NULL CHECK (vehicle_type IN ('rickshaw_van', 'mini_truck', 'compactor')),
    driver_name_bn     TEXT NOT NULL,
    driver_phone       VARCHAR(20) NOT NULL UNIQUE,
    ward_id            SMALLINT NOT NULL REFERENCES wards(id),
    current_location   GEOMETRY(Point, 4326) NOT NULL,
    status             VARCHAR(24) NOT NULL DEFAULT 'available'
                       CHECK (status IN ('available', 'en_route', 'busy', 'offline')),
    last_ping_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_collector_vehicles_loc_gist ON collector_vehicles USING GIST (current_location);
CREATE INDEX IF NOT EXISTS idx_collector_vehicles_ward_status ON collector_vehicles (ward_id, status);

-- 7. On-Demand & Scheduled Citizen Pickup Requests
CREATE TABLE IF NOT EXISTS pickup_requests (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tracking_code         VARCHAR(24) NOT NULL UNIQUE,
    user_id               UUID REFERENCES users(id) ON DELETE SET NULL,
    citizen_name          VARCHAR(120) NOT NULL,
    citizen_phone         VARCHAR(20) NOT NULL,
    ward_id               SMALLINT NOT NULL REFERENCES wards(id),
    address_line          VARCHAR(300) NOT NULL,
    landmark              VARCHAR(200) NOT NULL DEFAULT '',
    waste_type            VARCHAR(24) NOT NULL
                          CHECK (waste_type IN ('household', 'organic', 'recyclable', 'bulky')),
    slot                  VARCHAR(24) NOT NULL
                          CHECK (slot IN ('morning', 'afternoon', 'evening')),
    schedule_type         VARCHAR(24) NOT NULL DEFAULT 'one_time'
                          CHECK (schedule_type IN ('one_time', 'recurring_weekly')),
    preferred_day         VARCHAR(16),
    estimated_bags        SMALLINT NOT NULL DEFAULT 1 CHECK (estimated_bags BETWEEN 1 AND 50),
    weight_kg             DOUBLE PRECISION CHECK (weight_kg IS NULL OR (weight_kg >= 0 AND weight_kg <= 10000)),
    status                VARCHAR(24) NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'assigned', 'in_progress', 'collected', 'cancelled')),
    location              GEOMETRY(Point, 4326) NOT NULL,
    assigned_vehicle_id   UUID REFERENCES collector_vehicles(id) ON DELETE SET NULL,
    notes                 VARCHAR(500) NOT NULL DEFAULT '',
    completion_photo_url  TEXT,
    completed_at          TIMESTAMPTZ,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pickup_requests_loc_gist ON pickup_requests USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_pickup_requests_ward_status ON pickup_requests (ward_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pickup_requests_phone ON pickup_requests (citizen_phone);
CREATE INDEX IF NOT EXISTS idx_pickup_requests_user ON pickup_requests (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pickup_requests_vehicle ON pickup_requests (assigned_vehicle_id, status);

-- 8. Geo-Tagged Illegal Dump Photo Reports (with 50m PostGIS duplicate clustering)
CREATE TABLE IF NOT EXISTS dump_reports (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tracking_code         VARCHAR(24) NOT NULL UNIQUE,
    user_id               UUID REFERENCES users(id) ON DELETE SET NULL,
    reporter_name         VARCHAR(120) NOT NULL DEFAULT '',
    reporter_phone        VARCHAR(20) NOT NULL,
    ward_id               SMALLINT NOT NULL REFERENCES wards(id),
    title_bn              VARCHAR(200) NOT NULL,
    description_bn        VARCHAR(1000) NOT NULL DEFAULT '',
    landmark              VARCHAR(200) NOT NULL,
    severity              VARCHAR(16) NOT NULL DEFAULT 'medium'
                          CHECK (severity IN ('medium', 'high', 'critical')),
    status                VARCHAR(24) NOT NULL DEFAULT 'reported'
                          CHECK (status IN ('reported', 'verified', 'dispatched', 'cleared', 'rejected')),
    location              GEOMETRY(Point, 4326) NOT NULL,
    photo_urls            JSONB NOT NULL DEFAULT '[]'::jsonb,
    resolved_photo_url    TEXT,
    assigned_vehicle_id   UUID REFERENCES collector_vehicles(id) ON DELETE SET NULL,
    duplicate_of          UUID REFERENCES dump_reports(id) ON DELETE SET NULL,
    duplicate_count       INTEGER NOT NULL DEFAULT 0 CHECK (duplicate_count >= 0),
    cleared_at            TIMESTAMPTZ,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dump_reports_loc_gist ON dump_reports USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_dump_reports_open_loc_gist
    ON dump_reports USING GIST (location)
    WHERE status IN ('reported', 'verified', 'dispatched') AND duplicate_of IS NULL;
CREATE INDEX IF NOT EXISTS idx_dump_reports_ward_status ON dump_reports (ward_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dump_reports_phone ON dump_reports (reporter_phone);
CREATE INDEX IF NOT EXISTS idx_dump_reports_user ON dump_reports (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dump_reports_duplicate_of ON dump_reports (duplicate_of) WHERE duplicate_of IS NOT NULL;

-- 9. Partner Recyclable Lots (Dry-Waste Aggregation)
CREATE TABLE IF NOT EXISTS recyclable_lots (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lot_code              VARCHAR(24) NOT NULL UNIQUE,
    ward_id               SMALLINT NOT NULL REFERENCES wards(id),
    material_type         VARCHAR(24) NOT NULL
                          CHECK (material_type IN ('plastic', 'paper_cardboard', 'metal_ewaste', 'glass')),
    estimated_kg          NUMERIC(8, 2) NOT NULL CHECK (estimated_kg > 0),
    pickup_hub_bn         VARCHAR(200) NOT NULL,
    status                VARCHAR(24) NOT NULL DEFAULT 'open'
                          CHECK (status IN ('open', 'claimed', 'collected')),
    claimed_partner_id    UUID REFERENCES partners(id) ON DELETE SET NULL,
    claimed_partner_name  VARCHAR(160),
    collected_at          TIMESTAMPTZ,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recyclable_lots_status ON recyclable_lots (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recyclable_lots_partner ON recyclable_lots (claimed_partner_id, status);

-- 10. FK-Validated Status Audit Trail
CREATE TABLE IF NOT EXISTS status_events (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type       VARCHAR(24) NOT NULL CHECK (entity_type IN ('pickup', 'dump_report', 'recyclable_lot')),
    entity_id         UUID NOT NULL,
    pickup_id         UUID REFERENCES pickup_requests(id) ON DELETE CASCADE,
    dump_report_id    UUID REFERENCES dump_reports(id) ON DELETE CASCADE,
    recyclable_lot_id UUID REFERENCES recyclable_lots(id) ON DELETE CASCADE,
    from_status       VARCHAR(24),
    to_status         VARCHAR(24) NOT NULL,
    actor_user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
    actor_label       VARCHAR(120) NOT NULL,
    note_bn           VARCHAR(500) NOT NULL DEFAULT '',
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (
        (entity_type = 'pickup' AND pickup_id = entity_id AND dump_report_id IS NULL AND recyclable_lot_id IS NULL)
        OR (entity_type = 'dump_report' AND dump_report_id = entity_id AND pickup_id IS NULL AND recyclable_lot_id IS NULL)
        OR (entity_type = 'recyclable_lot' AND recyclable_lot_id = entity_id AND pickup_id IS NULL AND dump_report_id IS NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_status_events_entity ON status_events (entity_type, entity_id, created_at ASC);

-- 11. Collector Offline Sync Idempotency Keys & Task Completions
CREATE TABLE IF NOT EXISTS idempotency_keys (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id               UUID REFERENCES users(id) ON DELETE SET NULL,
    idempotency_key       VARCHAR(128) NOT NULL,
    request_scope         VARCHAR(160) NOT NULL,
    request_fingerprint   VARCHAR(64) NOT NULL,
    response_status       SMALLINT,
    response_body         JSONB,
    expires_at            TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (idempotency_key, request_scope)
);

CREATE INDEX IF NOT EXISTS idx_idempotency_keys_expires ON idempotency_keys (expires_at);

CREATE TABLE IF NOT EXISTS task_completions (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_type             VARCHAR(24) NOT NULL CHECK (task_type IN ('pickup', 'dump_report')),
    task_id               UUID NOT NULL,
    pickup_id             UUID REFERENCES pickup_requests(id) ON DELETE CASCADE,
    dump_report_id        UUID REFERENCES dump_reports(id) ON DELETE CASCADE,
    vehicle_id            UUID REFERENCES collector_vehicles(id) ON DELETE SET NULL,
    actor_user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
    idempotency_key       VARCHAR(128) NOT NULL UNIQUE,
    weight_kg             DOUBLE PRECISION,
    photo_url             TEXT,
    notes                 VARCHAR(500) NOT NULL DEFAULT '',
    completed_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (
        (task_type = 'pickup' AND pickup_id = task_id AND dump_report_id IS NULL)
        OR (task_type = 'dump_report' AND dump_report_id = task_id AND pickup_id IS NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_task_completions_task ON task_completions (task_type, task_id);

-- 12. User Notifications (Status updates, assignment alerts, partner reminders)
CREATE TABLE IF NOT EXISTS notifications (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title_bn      VARCHAR(200) NOT NULL,
    body_bn       VARCHAR(500) NOT NULL,
    entity_type   VARCHAR(24),
    entity_id     UUID,
    is_read       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications (user_id, is_read, created_at DESC);
