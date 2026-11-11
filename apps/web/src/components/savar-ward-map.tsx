'use client';

import type {
  CollectorVehicleRecord,
  DumpReportRecord,
  PickupRequestRecord,
  WardSummary,
} from '@/lib/types';

interface SavarWardMapProps {
  wards: WardSummary[];
  pickups: PickupRequestRecord[];
  reports: DumpReportRecord[];
  vehicles: CollectorVehicleRecord[];
  selectedWardId: number | null;
  onSelectWard: (wardId: number | null) => void;
}

const MIN_LAT = 23.838;
const MAX_LAT = 23.894;
const MIN_LNG = 90.240;
const MAX_LNG = 90.284;

function project(lat: number, lng: number): { x: number; y: number } {
  const clampedLng = Math.min(MAX_LNG, Math.max(MIN_LNG, lng));
  const clampedLat = Math.min(MAX_LAT, Math.max(MIN_LAT, lat));
  const x = ((clampedLng - MIN_LNG) / (MAX_LNG - MIN_LNG)) * 560 + 20;
  const y = 340 - ((clampedLat - MIN_LAT) / (MAX_LAT - MIN_LAT)) * 300;
  return { x, y };
}

export function SavarWardMap({
  wards,
  pickups,
  reports,
  vehicles,
  selectedWardId,
  onSelectWard,
}: SavarWardMapProps) {
  return (
    <section aria-labelledby="savar-spatial-map-heading" className="cs-card p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 id="savar-spatial-map-heading" className="text-base font-bold text-[#0F172A]">
            সাভার পৌরসভা ওয়ার্ড ম্যাপ (PostGIS কোঅর্ডিনেট)
          </h2>
          <p className="text-xs text-[#475569]">
            যেকোনো ওয়ার্ডে ক্লিক করে সেই এলাকার পিকআপ ও ময়লার রিপোর্ট আলাদা করুন
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-[#475569]">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#DC2626]" aria-hidden="true" />
            ময়লার স্তূপ
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#D97706]" aria-hidden="true" />
            পিকআপ পিন
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-[#15803D]" aria-hidden="true" />
            কালেক্টর গাড়ি
          </span>
        </div>
      </div>

      <div className="overflow-hidden rounded-md border border-[#E2E8F0] bg-[#F8FAFC]">
        <svg
          role="img"
          aria-label="সাভার পৌরসভা ওয়ার্ড ১ থেকে ৯ এর পিকআপ, ময়লার স্তূপ ও গাড়ির অবস্থান ম্যাপ"
          viewBox="0 0 600 360"
          className="h-auto w-full"
        >
          {/* Subtle coordinate grid */}
          {[80, 160, 240, 320].map((y) => (
            <line key={y} x1="16" y1={y} x2="584" y2={y} stroke="#E2E8F0" strokeWidth="1" />
          ))}
          {[120, 240, 360, 480].map((x) => (
            <line key={x} x1={x} y1="16" x2={x} y2="344" stroke="#E2E8F0" strokeWidth="1" />
          ))}

          {/* Dhaka-Aricha Highway reference line */}
          <path
            d="M 190 345 L 250 220 L 310 125 L 405 18"
            fill="none"
            stroke="#CBD5E1"
            strokeWidth="6"
            strokeLinecap="round"
          />
          <text x="315" y="110" fill="#64748B" fontSize="10" fontFamily="Inter, sans-serif">
            Dhaka-Aricha Hwy (N5)
          </text>

          {/* Ward zone hubs */}
          {wards.map((ward) => {
            const pt = project(ward.centroid_lat, ward.centroid_lng);
            const selected = selectedWardId === ward.id;
            return (
              <g
                key={ward.id}
                onClick={() => onSelectWard(selected ? null : ward.id)}
                className="cursor-pointer"
              >
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={selected ? 26 : 22}
                  fill={selected ? '#DCFCE7' : '#FFFFFF'}
                  stroke={selected ? '#15803D' : '#CBD5E1'}
                  strokeWidth={selected ? 2 : 1}
                />
                <text
                  x={pt.x}
                  y={pt.y - 2}
                  textAnchor="middle"
                  fill="#0F172A"
                  fontSize="10"
                  fontWeight="700"
                  fontFamily="Inter, sans-serif"
                >
                  W{ward.id}
                </text>
                <text
                  x={pt.x}
                  y={pt.y + 11}
                  textAnchor="middle"
                  fill="#475569"
                  fontSize="9"
                >
                  {ward.zone_label_bn}
                </text>
              </g>
            );
          })}

          {/* Pending Pickup Requests */}
          {pickups
            .filter((p) => p.status !== 'collected' && p.status !== 'cancelled')
            .map((p) => {
              const pt = project(p.lat, p.lng);
              return (
                <circle
                  key={p.id}
                  cx={pt.x + 12}
                  cy={pt.y - 10}
                  r="5"
                  fill="#D97706"
                  stroke="#FFFFFF"
                  strokeWidth="1.5"
                >
                  <title>{`${p.tracking_code}: ${p.address_line}`}</title>
                </circle>
              );
            })}

          {/* Open Dump Reports */}
          {reports
            .filter((r) => r.status !== 'cleared' && r.status !== 'rejected')
            .map((r) => {
              const pt = project(r.lat, r.lng);
              return (
                <circle
                  key={r.id}
                  cx={pt.x - 12}
                  cy={pt.y - 10}
                  r="6"
                  fill="#DC2626"
                  stroke="#FFFFFF"
                  strokeWidth="1.5"
                >
                  <title>{`${r.tracking_code}: ${r.title_bn}`}</title>
                </circle>
              );
            })}

          {/* Collector Vehicles */}
          {vehicles.map((v) => {
            const pt = project(v.lat, v.lng);
            return (
              <rect
                key={v.id}
                x={pt.x - 6}
                y={pt.y + 14}
                width="12"
                height="10"
                rx="2"
                fill="#15803D"
                stroke="#FFFFFF"
                strokeWidth="1.5"
              >
                <title>{`${v.code} (${v.driver_name_bn})`}</title>
              </rect>
            );
          })}
        </svg>
      </div>
    </section>
  );
}
