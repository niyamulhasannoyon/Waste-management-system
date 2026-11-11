export type WasteType = 'household' | 'organic' | 'recyclable' | 'bulky';
export type PickupSlot = 'morning' | 'afternoon' | 'evening';
export type PickupStatus = 'pending' | 'assigned' | 'in_progress' | 'collected' | 'cancelled';

export type ReportSeverity = 'medium' | 'high' | 'critical';
export type ReportStatus = 'reported' | 'verified' | 'dispatched' | 'cleared' | 'rejected';

export type VehicleType = 'rickshaw_van' | 'mini_truck' | 'compactor';
export type VehicleStatus = 'available' | 'en_route' | 'busy' | 'offline';

export type MaterialType = 'plastic' | 'paper_cardboard' | 'metal_ewaste' | 'glass';
export type LotStatus = 'open' | 'claimed' | 'collected';

export interface WardSummary {
  id: number;
  code: string;
  name_bn: string;
  name_en: string;
  zone_label_bn: string;
  supervisor_name: string;
  supervisor_phone: string;
  centroid_lat: number;
  centroid_lng: number;
  pending_pickups: number;
  open_reports: number;
  active_vehicles: number;
}

export interface PickupRequestRecord {
  id: string;
  tracking_code: string;
  citizen_name: string;
  citizen_phone: string;
  ward_id: number;
  ward_name_bn: string;
  address_line: string;
  landmark: string;
  waste_type: WasteType;
  slot: PickupSlot;
  estimated_bags: number;
  status: PickupStatus;
  lat: number;
  lng: number;
  assigned_vehicle_id: string | null;
  assigned_vehicle_code: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePickupInput {
  citizen_name: string;
  citizen_phone: string;
  ward_id: number;
  address_line: string;
  landmark: string;
  waste_type: WasteType;
  slot: PickupSlot;
  estimated_bags: number;
  lat?: number;
  lng?: number;
  notes: string;
}

export interface DumpReportRecord {
  id: string;
  tracking_code: string;
  reporter_name: string;
  reporter_phone: string;
  ward_id: number;
  ward_name_bn: string;
  title_bn: string;
  description_bn: string;
  landmark: string;
  severity: ReportSeverity;
  status: ReportStatus;
  lat: number;
  lng: number;
  photo_urls: string[];
  resolved_photo_url: string | null;
  assigned_vehicle_id: string | null;
  assigned_vehicle_code: string | null;
  cleared_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateDumpReportInput {
  reporter_name: string;
  reporter_phone: string;
  ward_id?: number;
  title_bn: string;
  description_bn: string;
  landmark: string;
  severity: ReportSeverity;
  lat: number;
  lng: number;
  photo_urls: string[];
}

export interface CollectorVehicleRecord {
  id: string;
  code: string;
  vehicle_type: VehicleType;
  driver_name_bn: string;
  driver_phone: string;
  ward_id: number;
  ward_name_bn: string;
  lat: number;
  lng: number;
  status: VehicleStatus;
  distance_meters: number | null;
  last_ping_at: string;
}

export interface RecyclableLotRecord {
  id: string;
  lot_code: string;
  ward_id: number;
  ward_name_bn: string;
  material_type: MaterialType;
  estimated_kg: number;
  pickup_hub_bn: string;
  status: LotStatus;
  claimed_partner_name: string | null;
  created_at: string;
}

export interface StatusEventRecord {
  id: string;
  entity_type: 'pickup' | 'dump_report' | 'recyclable_lot';
  entity_id: string;
  from_status: string | null;
  to_status: string;
  actor_label: string;
  note_bn: string;
  created_at: string;
}

export interface TrackedResult {
  kind: 'pickup' | 'dump_report';
  pickup?: PickupRequestRecord;
  report?: DumpReportRecord;
  events: StatusEventRecord[];
}
