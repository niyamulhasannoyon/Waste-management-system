-- Clean Savar (ক্লিন সাভার) — Geography GIST & Trigram Indexes, Audit Logs, PII Retention & Demo Isolation

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 1. Functional PostGIS ::geography GIST indexes matching ST_DWithin / ST_Distance queries
CREATE INDEX IF NOT EXISTS idx_collector_vehicles_loc_geog_gist
    ON collector_vehicles USING GIST ((current_location::geography));

CREATE INDEX IF NOT EXISTS idx_dump_reports_open_loc_geog_gist
    ON dump_reports USING GIST ((location::geography))
    WHERE status IN ('reported', 'verified', 'dispatched') AND duplicate_of IS NULL;

CREATE INDEX IF NOT EXISTS idx_pickup_requests_loc_geog_gist
    ON pickup_requests USING GIST ((location::geography));

CREATE INDEX IF NOT EXISTS idx_wards_centroid_geog_gist
    ON wards USING GIST ((centroid::geography));

-- 2. Trigram GIN indexes accelerating ILIKE search filters and partial active-session lookup
CREATE INDEX IF NOT EXISTS idx_pickup_requests_tracking_trgm
    ON pickup_requests USING GIN (tracking_code gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_pickup_requests_address_trgm
    ON pickup_requests USING GIN (address_line gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_dump_reports_tracking_trgm
    ON dump_reports USING GIN (tracking_code gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_dump_reports_landmark_trgm
    ON dump_reports USING GIN (landmark gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_active
    ON auth_sessions (user_id, expires_at)
    WHERE revoked_at IS NULL;

-- 3. Immutable security & operational audit trail
CREATE TABLE IF NOT EXISTS audit_logs (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    actor_role    VARCHAR(24),
    action        VARCHAR(64) NOT NULL,
    entity_type   VARCHAR(32),
    entity_id     UUID,
    ip_address    VARCHAR(64),
    metadata      JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created
    ON audit_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action_created
    ON audit_logs (action, created_at DESC);

-- 4. PII retention, erasure & demo seed isolation columns
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS anonymized_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS retention_until TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE partners
    ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE collector_vehicles
    ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE pickup_requests
    ADD COLUMN IF NOT EXISTS anonymized_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS retention_until TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '365 days'),
    ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE dump_reports
    ADD COLUMN IF NOT EXISTS anonymized_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS retention_until TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '365 days'),
    ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE recyclable_lots
    ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE notifications
    ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE pickup_requests
SET retention_until = created_at + INTERVAL '365 days'
WHERE retention_until IS NULL;

UPDATE dump_reports
SET retention_until = created_at + INTERVAL '365 days'
WHERE retention_until IS NULL;

-- Tag deterministic 0002 demo fixtures so staging/production operators can strip them cleanly
UPDATE users
SET is_demo = TRUE
WHERE id::text LIKE 'aaaa1111-%';

UPDATE partners
SET is_demo = TRUE
WHERE id::text LIKE 'bbbb1111-%';

UPDATE collector_vehicles
SET is_demo = TRUE
WHERE id::text LIKE '11111111-%';

UPDATE pickup_requests
SET is_demo = TRUE
WHERE id::text LIKE '22222222-%';

UPDATE dump_reports
SET is_demo = TRUE
WHERE id::text LIKE '33333333-%';

UPDATE recyclable_lots
SET is_demo = TRUE
WHERE id::text LIKE '44444444-%';

UPDATE notifications
SET is_demo = TRUE
WHERE id::text LIKE '55555555-%';

-- 5. Scheduled PII retention & transient token purge procedure
CREATE OR REPLACE FUNCTION purge_expired_pii(p_retention_days INTEGER DEFAULT 365)
RETURNS TABLE (
    purged_otps BIGINT,
    purged_sessions BIGINT,
    purged_idempotency BIGINT,
    anonymized_pickups BIGINT,
    anonymized_reports BIGINT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_days INTEGER := GREATEST(30, LEAST(COALESCE(p_retention_days, 365), 3650));
    v_otps BIGINT := 0;
    v_sessions BIGINT := 0;
    v_idem BIGINT := 0;
    v_pickups BIGINT := 0;
    v_reports BIGINT := 0;
BEGIN
    DELETE FROM otp_codes
    WHERE expires_at < NOW() - INTERVAL '7 days'
       OR (consumed_at IS NOT NULL AND consumed_at < NOW() - INTERVAL '7 days');
    GET DIAGNOSTICS v_otps = ROW_COUNT;

    DELETE FROM auth_sessions
    WHERE expires_at < NOW() - INTERVAL '30 days'
       OR (revoked_at IS NOT NULL AND revoked_at < NOW() - INTERVAL '30 days');
    GET DIAGNOSTICS v_sessions = ROW_COUNT;

    DELETE FROM idempotency_keys
    WHERE expires_at < NOW();
    GET DIAGNOSTICS v_idem = ROW_COUNT;

    UPDATE pickup_requests
    SET citizen_name = 'Anonymous',
        citizen_phone = '00000-000000',
        address_line = 'Anonymized',
        landmark = '',
        notes = '',
        location = w.centroid,
        anonymized_at = NOW(),
        updated_at = NOW()
    FROM wards w
    WHERE w.id = pickup_requests.ward_id
      AND pickup_requests.anonymized_at IS NULL
      AND pickup_requests.status IN ('collected', 'cancelled')
      AND COALESCE(pickup_requests.retention_until, pickup_requests.created_at + make_interval(days => v_days)) <= NOW();
    GET DIAGNOSTICS v_pickups = ROW_COUNT;

    UPDATE dump_reports
    SET reporter_name = '',
        reporter_phone = '00000-000000',
        location = w.centroid,
        anonymized_at = NOW(),
        updated_at = NOW()
    FROM wards w
    WHERE w.id = dump_reports.ward_id
      AND dump_reports.anonymized_at IS NULL
      AND dump_reports.status IN ('cleared', 'rejected')
      AND COALESCE(dump_reports.retention_until, dump_reports.created_at + make_interval(days => v_days)) <= NOW();
    GET DIAGNOSTICS v_reports = ROW_COUNT;

    RETURN QUERY SELECT v_otps, v_sessions, v_idem, v_pickups, v_reports;
END;
$$;
