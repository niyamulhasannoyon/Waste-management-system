import React from 'react';
import { AlertTriangle, CheckCircle2, Recycle, Truck } from 'lucide-react';
import type { AnalyticsSummary } from '@/lib/types';
import { toBanglaDigits } from '@/lib/utils';

export function AdminOverviewStats({ summary }: { summary: AnalyticsSummary }) {
  const cards = [
    {
      label: 'মোট পিকআপ অনুরোধ',
      value: toBanglaDigits(summary.total_pickups),
      sub: `${toBanglaDigits(summary.pending_pickups)}টি প্রক্রিয়াধীন · ${toBanglaDigits(summary.completed_pickups)}টি সম্পন্ন`,
      icon: Truck,
      accent: 'text-[#15803D]',
    },
    {
      label: 'খোলা ময়লার হটস্পট',
      value: toBanglaDigits(summary.open_reports),
      sub: `${toBanglaDigits(summary.cleared_reports)}টি পরিষ্কার (${toBanglaDigits(Math.round(summary.resolution_rate_percent))}%)`,
      icon: AlertTriangle,
      accent: 'text-[#B91C1C]',
    },
    {
      label: 'আজকের সংগৃহীত ওজন',
      value: `${toBanglaDigits(summary.collected_weight_today_kg.toFixed(1))} কেজি`,
      sub: `${toBanglaDigits(summary.active_vehicles)}টি গাড়ি সক্রিয়`,
      icon: CheckCircle2,
      accent: 'text-[#14532D]',
    },
    {
      label: 'খোলা রিসাইক্লিং লট',
      value: `${toBanglaDigits(Math.round(summary.recyclable_open_kg))} কেজি`,
      sub: 'পার্টনার সংগ্রহের জন্য উন্মুক্ত',
      icon: Recycle,
      accent: 'text-[#0369A1]',
    },
  ] as const;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.label} className="cs-card p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-[#475569]">{card.label}</p>
              <Icon className={`h-4 w-4 ${card.accent}`} aria-hidden="true" />
            </div>
            <p className="mt-2 font-metric text-2xl font-bold text-[#0F172A]">
              {card.value}
            </p>
            <p className="mt-0.5 text-xs text-[#475569]">{card.sub}</p>
          </div>
        );
      })}
    </div>
  );
}
