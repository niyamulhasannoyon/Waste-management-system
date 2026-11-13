export type UserRole = 'citizen' | 'collector' | 'partner' | 'admin';

export type WasteType = 'household' | 'organic' | 'recyclable' | 'bulky';
export type PickupSlot = 'morning' | 'afternoon' | 'evening';
export type ScheduleType = 'one_time' | 'recurring_weekly';
export type PreferredDay =
  | 'saturday'
  | 'sunday'
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday';
export type PickupStatus = 'pending' | 'assigned' | 'in_progress' | 'collected' | 'cancelled';

export type ReportSeverity = 'medium' | 'high' | 'critical';
export type ReportStatus = 'reported' | 'verified' | 'dispatched' | 'cleared' | 'rejected';

export type VehicleType = 'rickshaw_van' | 'mini_truck' | 'compactor';
export type VehicleStatus = 'available' | 'en_route' | 'busy' | 'offline';

export type MaterialType = 'plastic' | 'paper_cardboard' | 'metal_ewaste' | 'glass';
export type LotStatus = 'open' | 'claimed' | 'collected';

export type ZoneType = 'municipality_ward' | 'union';

export interface UserRecord {
  id: string;
  phone: string;
  full_name: string;
  role: UserRole;
  ward_id: number | null;
  is_verified: boolean;
  created_at: string;
}

export interface AuthenticatedProfile {
  user: UserRecord;
  vehicle_id: string | null;
  partner_id: string | null;
  partner_name: string | null;
}

export interface AuthSession {
  accessToken: string;
  expiresAtIso: string;
  profile: AuthenticatedProfile;
}

export interface OtpLoginResponse {
  phone: string;
  expires_in_seconds: number;
  message: string;
  message_bn: string;
  otp_preview?: string;
}

export interface OtpVerifyResponse {
  access_token: string;
  token_type: 'Bearer';
  expires_in_seconds: number;
  profile: AuthenticatedProfile;
}

export interface NotificationRecord {
  id: string;
  title_bn: string;
  body_bn: string;
  entity_type: string | null;
  entity_id: string | null;
  is_read: boolean;
  created_at: string;
}

export interface WardSummary {
  id: number;
  code: string;
  zone_type: ZoneType;
  ward_number: number | null;
  name_bn: string;
  name_en: string;
  zone_label_bn: string;
  neighborhoods: string[];
  schedule_bn: string;
  frequency_bn: string;
  supervisor_name: string;
  supervisor_phone: string;
  centroid_lat: number;
  centroid_lng: number;
  pending_pickups: number;
  open_reports: number;
  active_vehicles: number;
}

export interface ResolvedWardResponse {
  ward_id: number;
  code: string;
  zone_type: ZoneType;
  name_bn: string;
  name_en: string;
  zone_label_bn: string;
  exact_match: boolean;
}

export interface AnalyticsSummary {
  total_pickups: number;
  pending_pickups: number;
  completed_pickups: number;
  total_reports: number;
  open_reports: number;
  cleared_reports: number;
  resolution_rate_percent: number;
  collected_weight_today_kg: number;
  active_vehicles: number;
  recyclable_open_kg: number;
}

export interface PickupRequestRecord {
  id: string;
  tracking_code: string;
  user_id?: string | null;
  citizen_name: string;
  citizen_phone: string;
  ward_id: number;
  ward_name_bn: string;
  address_line: string;
  landmark: string;
  waste_type: WasteType;
  slot: PickupSlot;
  schedule_type: ScheduleType;
  preferred_day: string | null;
  estimated_bags: number;
  weight_kg?: number | null;
  status: PickupStatus;
  lat: number;
  lng: number;
  assigned_vehicle_id: string | null;
  assigned_vehicle_code: string | null;
  notes: string;
  completion_photo_url?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePickupInput {
  citizen_name?: string;
  citizen_phone?: string;
  ward_id?: number;
  address_line: string;
  landmark: string;
  waste_type: WasteType;
  slot: PickupSlot;
  schedule_type: ScheduleType;
  preferred_day?: PreferredDay | null;
  estimated_bags: number;
  lat?: number;
  lng?: number;
  notes: string;
}

export interface PublicHotspotRecord {
  id: string;
  tracking_code: string;
  ward_id: number;
  ward_name_bn: string;
  title_bn: string;
  landmark: string;
  severity: ReportSeverity;
  status: ReportStatus;
  lat: number;
  lng: number;
  duplicate_count: number;
  cleared_at: string | null;
  created_at: string;
}

export interface DumpReportRecord {
  id: string;
  tracking_code: string;
  user_id?: string | null;
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
  duplicate_of?: string | null;
  duplicate_count?: number;
  cleared_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateDumpReportInput {
  reporter_name?: string;
  reporter_phone?: string;
  ward_id?: number;
  title_bn: string;
  description_bn: string;
  landmark: string;
  severity: ReportSeverity;
  lat: number;
  lng: number;
  photo_urls: string[];
}

export interface CreateDumpReportResponse {
  is_duplicate: boolean;
  duplicate_of: string | null;
  duplicate_distance_meters: number | null;
  report: DumpReportRecord;
}

export interface CollectorVehicleRecord {
  id: string;
  user_id?: string | null;
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
  claimed_partner_id?: string | null;
  claimed_partner_name: string | null;
  collected_at?: string | null;
  created_at: string;
}

export interface CreateRecyclableLotInput {
  ward_id: number;
  material_type: MaterialType;
  estimated_kg: number;
  pickup_hub_bn: string;
}

export interface CompleteTaskResponse {
  completion_id: string;
  task_type: 'pickup' | 'dump_report';
  task_id: string;
  tracking_code: string;
  status: string;
  vehicle_id: string | null;
  weight_kg: number | null;
  completion_photo_url: string | null;
  completed_at: string;
  idempotency_key: string;
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

export interface UploadPhotoResponse {
  object_key: string;
  url: string;
  mime_type: string;
  size_bytes: number;
}

export interface UpdateVehicleLocationInput {
  lat: number;
  lng: number;
  status?: VehicleStatus;
}

export interface DispatchAssignInput {
  entity_type: 'pickup' | 'dump_report';
  entity_id: string;
  vehicle_id?: string;
  note_bn: string;
}

export interface DispatchAssignResponse {
  entity_type: string;
  entity_id: string;
  assigned_vehicle_id?: string | null;
  assigned_vehicle_code?: string | null;
  new_status: string;
  status?: string;
}

export interface CompleteCollectorTaskInput {
  task_type?: 'pickup' | 'dump_report';
  weight_kg?: number;
  completion_photo_url?: string;
  notes: string;
}

export interface SyncCollectorOperation {
  entity_type: 'pickup' | 'dump_report';
  entity_id: string;
  idempotency_key: string;
  weight_kg?: number;
  completion_photo_url?: string;
  notes: string;
}

export interface SyncCollectorResponse {
  synced_count: number;
  skipped_count: number;
  results: CompleteTaskResponse[];
  failed_keys?: string[];
}
