-- Clean Savar (ক্লিন সাভার) — Core PostGIS Geospatial Schema
-- SRID 4326 (WGS 84) is used for all GPS coordinates and ward boundaries.

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Savar Wards & Service Zones
CREATE TABLE IF NOT EXISTS wards (
    id              SMALLINT PRIMARY KEY,
    code            VARCHAR(24) NOT NULL UNIQUE,
    name_bn         TEXT NOT NULL,
    name_en         TEXT NOT NULL,
    zone_label_bn   TEXT NOT NULL,
    supervisor_name TEXT NOT NULL,
    supervisor_phone VARCHAR(20) NOT NULL,
    boundary        GEOMETRY(MultiPolygon, 4326) NOT NULL,
    centroid        GEOMETRY(Point, 4326) NOT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wards_boundary_gist ON wards USING GIST (boundary);
CREATE INDEX IF NOT EXISTS idx_wards_centroid_gist ON wards USING GIST (centroid);

-- 2. Collector Vehicles & Field Units
CREATE TABLE IF NOT EXISTS collector_vehicles (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code              VARCHAR(32) NOT NULL UNIQUE,
    vehicle_type      VARCHAR(24) NOT NULL CHECK (vehicle_type IN ('rickshaw_van', 'mini_truck', 'compactor')),
    driver_name_bn    TEXT NOT NULL,
    driver_phone      VARCHAR(20) NOT NULL,
    ward_id           SMALLINT NOT NULL REFERENCES wards(id),
    current_location  GEOMETRY(Point, 4326) NOT NULL,
    status            VARCHAR(24) NOT NULL DEFAULT 'available'
                      CHECK (status IN ('available', 'en_route', 'busy', 'offline')),
    last_ping_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_collector_vehicles_loc_gist ON collector_vehicles USING GIST (current_location);
CREATE INDEX IF NOT EXISTS idx_collector_vehicles_ward_status ON collector_vehicles (ward_id, status);

-- 3. On-Demand Citizen Pickup Requests
CREATE TABLE IF NOT EXISTS pickup_requests (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tracking_code         VARCHAR(20) NOT NULL UNIQUE,
    citizen_name          TEXT NOT NULL,
    citizen_phone         VARCHAR(20) NOT NULL,
    ward_id               SMALLINT NOT NULL REFERENCES wards(id),
    address_line          TEXT NOT NULL,
    landmark              TEXT NOT NULL DEFAULT '',
    waste_type            VARCHAR(24) NOT NULL
                          CHECK (waste_type IN ('household', 'organic', 'recyclable', 'bulky')),
    slot                  VARCHAR(24) NOT NULL
                          CHECK (slot IN ('morning', 'afternoon', 'evening')),
    estimated_bags        SMALLINT NOT NULL DEFAULT 1 CHECK (estimated_bags BETWEEN 1 AND 50),
    status                VARCHAR(24) NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'assigned', 'in_progress', 'collected', 'cancelled')),
    location              GEOMETRY(Point, 4326) NOT NULL,
    assigned_vehicle_id   UUID REFERENCES collector_vehicles(id),
    notes                 TEXT NOT NULL DEFAULT '',
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pickup_requests_loc_gist ON pickup_requests USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_pickup_requests_ward_status ON pickup_requests (ward_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pickup_requests_phone ON pickup_requests (citizen_phone);

-- 4. Geo-Tagged Illegal Dump Photo Reports
CREATE TABLE IF NOT EXISTS dump_reports (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tracking_code         VARCHAR(20) NOT NULL UNIQUE,
    reporter_name         TEXT NOT NULL DEFAULT '',
    reporter_phone        VARCHAR(20) NOT NULL,
    ward_id               SMALLINT NOT NULL REFERENCES wards(id),
    title_bn              TEXT NOT NULL,
    description_bn        TEXT NOT NULL DEFAULT '',
    landmark              TEXT NOT NULL,
    severity              VARCHAR(16) NOT NULL DEFAULT 'medium'
                          CHECK (severity IN ('medium', 'high', 'critical')),
    status                VARCHAR(24) NOT NULL DEFAULT 'reported'
                          CHECK (status IN ('reported', 'verified', 'dispatched', 'cleared', 'rejected')),
    location              GEOMETRY(Point, 4326) NOT NULL,
    photo_urls            JSONB NOT NULL DEFAULT '[]'::jsonb,
    resolved_photo_url    TEXT,
    assigned_vehicle_id   UUID REFERENCES collector_vehicles(id),
    cleared_at            TIMESTAMPTZ,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dump_reports_loc_gist ON dump_reports USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_dump_reports_ward_status ON dump_reports (ward_id, status, created_at DESC);

-- 5. Partner Recyclable Lots (Dry-Waste Aggregation)
CREATE TABLE IF NOT EXISTS recyclable_lots (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lot_code              VARCHAR(24) NOT NULL UNIQUE,
    ward_id               SMALLINT NOT NULL REFERENCES wards(id),
    material_type         VARCHAR(24) NOT NULL
                          CHECK (material_type IN ('plastic', 'paper_cardboard', 'metal_ewaste', 'glass')),
    estimated_kg          NUMERIC(8, 2) NOT NULL CHECK (estimated_kg > 0),
    pickup_hub_bn         TEXT NOT NULL,
    status                VARCHAR(24) NOT NULL DEFAULT 'open'
                          CHECK (status IN ('open', 'claimed', 'collected')),
    claimed_partner_name  TEXT,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Immutable Status Audit Trail
CREATE TABLE IF NOT EXISTS status_events (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type   VARCHAR(24) NOT NULL CHECK (entity_type IN ('pickup', 'dump_report', 'recyclable_lot')),
    entity_id     UUID NOT NULL,
    from_status   VARCHAR(24),
    to_status     VARCHAR(24) NOT NULL,
    actor_label   TEXT NOT NULL,
    note_bn       TEXT NOT NULL DEFAULT '',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_status_events_entity ON status_events (entity_type, entity_id, created_at ASC);
