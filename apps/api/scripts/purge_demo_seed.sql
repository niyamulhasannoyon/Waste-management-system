-- Clean Savar — Operator script to strip 0002 demo fixtures in staging/production
-- Safe to run repeatedly; preserves canonical Savar wards (1-9, 101-106) and real production data.

BEGIN;

DELETE FROM notifications WHERE is_demo = TRUE;
DELETE FROM status_events
WHERE pickup_id IN (SELECT id FROM pickup_requests WHERE is_demo = TRUE)
   OR dump_report_id IN (SELECT id FROM dump_reports WHERE is_demo = TRUE);
DELETE FROM recyclable_lots WHERE is_demo = TRUE;
DELETE FROM dump_reports WHERE is_demo = TRUE;
DELETE FROM pickup_requests WHERE is_demo = TRUE;
DELETE FROM collector_vehicles WHERE is_demo = TRUE;
DELETE FROM partners WHERE is_demo = TRUE;
DELETE FROM users WHERE is_demo = TRUE;

COMMIT;
