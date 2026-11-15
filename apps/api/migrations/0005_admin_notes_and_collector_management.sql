-- Clean Savar Migration 0005: Admin Notes and Collector Vehicle Management
-- Adds admin_note, collector_name, collector_phone, and assigned_vehicle_code to pickup_requests and dump_reports.
-- Expands vehicle_type and status constraints for collector_vehicles.

ALTER TABLE pickup_requests 
  ADD COLUMN IF NOT EXISTS admin_note TEXT,
  ADD COLUMN IF NOT EXISTS collector_name TEXT,
  ADD COLUMN IF NOT EXISTS collector_phone TEXT,
  ADD COLUMN IF NOT EXISTS assigned_vehicle_code TEXT;

ALTER TABLE dump_reports 
  ADD COLUMN IF NOT EXISTS admin_note TEXT,
  ADD COLUMN IF NOT EXISTS collector_name TEXT,
  ADD COLUMN IF NOT EXISTS collector_phone TEXT,
  ADD COLUMN IF NOT EXISTS assigned_vehicle_code TEXT;

-- Expand vehicle_type constraint to allow cng_dumper and other
ALTER TABLE collector_vehicles DROP CONSTRAINT IF EXISTS collector_vehicles_vehicle_type_check;
ALTER TABLE collector_vehicles ADD CONSTRAINT collector_vehicles_vehicle_type_check 
  CHECK (vehicle_type IN ('rickshaw_van', 'cng_dumper', 'mini_truck', 'compactor', 'other'));

-- Expand status constraint to allow active as well as available
ALTER TABLE collector_vehicles DROP CONSTRAINT IF EXISTS collector_vehicles_status_check;
ALTER TABLE collector_vehicles ADD CONSTRAINT collector_vehicles_status_check 
  CHECK (status IN ('available', 'active', 'en_route', 'busy', 'offline'));
