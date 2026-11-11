"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  Collector,
  Hotspot,
  INITIAL_COLLECTORS,
  INITIAL_HOTSPOTS,
  INITIAL_RECYCLING_BATCHES,
  INITIAL_REQUESTS,
  PriorityLevel,
  RecyclingBatch,
  RequestKind,
  SERVICE_ZONES,
  ServiceZone,
  WasteRequest,
} from "@/data/savarData";

export interface NewRequestPayload {
  kind: RequestKind;
  zoneId: string;
  addressOrLandmark: string;
  wasteType: string;
  timeSlot?: string;
  quantity?: string;
  reporterPhone?: string;
  gpsLabel?: string;
  photoPreview?: string;
  photoName?: string;
  notes?: string;
  priority?: PriorityLevel;
}

interface PersistedState {
  requests: WasteRequest[];
  zones: ServiceZone[];
  collectors: Collector[];
  hotspots: Hotspot[];
  recyclingBatches: RecyclingBatch[];
}

interface CleanSavarContextValue extends PersistedState {
  activeActionTab: RequestKind;
  setActiveActionTab: (tab: RequestKind) => void;
  selectedZoneForForm: string;
  setSelectedZoneForForm: (zoneId: string) => void;
  actionModalKind: RequestKind | null;
  openActionModal: (kind: RequestKind, zoneId?: string) => void;
  closeActionModal: () => void;
  focusQuickAction: (tab: RequestKind, zoneId?: string) => void;
  submitRequest: (payload: NewRequestPayload) => WasteRequest;
  assignCollector: (requestId: string, collectorId: string) => void;
  markRequestCompleted: (requestId: string) => void;
  dispatchToHotspot: (hotspotId: string, collectorId: string) => void;
  markHotspotCleared: (hotspotId: string) => void;
  toggleCollectorStatus: (collectorId: string) => void;
  toggleZoneActive: (zoneId: string) => void;
  updateZoneSchedule: (zoneId: string, schedule: string) => void;
  addRecyclingBatch: (batch: Omit<RecyclingBatch, "id" | "loggedAt">) => void;
  resetDemoData: () => void;
  kpis: {
    totalCollectedTons: number;
    pendingRequestsCount: number;
    resolvedComplaintsPercent: number;
    activeWorkersCount: number;
  };
}

const STORAGE_KEY = "clean-savar-state-v1";

const DEFAULT_PERSISTED: PersistedState = {
  requests: INITIAL_REQUESTS,
  zones: SERVICE_ZONES,
  collectors: INITIAL_COLLECTORS,
  hotspots: INITIAL_HOTSPOTS,
  recyclingBatches: INITIAL_RECYCLING_BATCHES,
};

const CleanSavarContext = createContext<CleanSavarContextValue | null>(null);

export function CleanSavarProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PersistedState>(DEFAULT_PERSISTED);
  const [hydrated, setHydrated] = useState(false);

  const [activeActionTab, setActiveActionTab] = useState<RequestKind>("report");
  const [selectedZoneForForm, setSelectedZoneForForm] = useState<string>("ward-5");
  const [actionModalKind, setActionModalKind] = useState<RequestKind | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<PersistedState>;
        if (parsed && Array.isArray(parsed.requests) && Array.isArray(parsed.zones)) {
          setState({
            requests: parsed.requests,
            zones: parsed.zones,
            collectors: Array.isArray(parsed.collectors) ? parsed.collectors : INITIAL_COLLECTORS,
            hotspots: Array.isArray(parsed.hotspots) ? parsed.hotspots : INITIAL_HOTSPOTS,
            recyclingBatches: Array.isArray(parsed.recyclingBatches)
              ? parsed.recyclingBatches
              : INITIAL_RECYCLING_BATCHES,
          });
        }
      }
    } catch {
      // Ignore storage read failures in restricted environments
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore quota/storage errors
    }
  }, [state, hydrated]);

  const openActionModal = useCallback((kind: RequestKind, zoneId?: string) => {
    if (zoneId) setSelectedZoneForForm(zoneId);
    setActionModalKind(kind);
  }, []);

  const closeActionModal = useCallback(() => {
    setActionModalKind(null);
  }, []);

  const focusQuickAction = useCallback((tab: RequestKind, zoneId?: string) => {
    setActiveActionTab(tab);
    if (zoneId) setSelectedZoneForForm(zoneId);
    const el = document.getElementById("quick-action");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      window.setTimeout(() => {
        const targetId = tab === "report" ? "inline-report-zone" : "inline-pickup-address";
        const target = document.getElementById(targetId);
        target?.focus({ preventScroll: true });
      }, 280);
    }
  }, []);

  const submitRequest = useCallback(
    (payload: NewRequestPayload): WasteRequest => {
      const zone =
        state.zones.find((z) => z.id === payload.zoneId) ??
        state.zones[0] ??
        DEFAULT_PERSISTED.zones[0]!;
      const nextNum = 1085 + Math.max(0, state.requests.length - INITIAL_REQUESTS.length);
      const areaTag = zone.neighborhoods[0] ?? zone.shortName;
      const newReq: WasteRequest = {
        id: `CS-${nextNum}`,
        kind: payload.kind,
        areaTag,
        zoneId: zone.id,
        addressOrLandmark: payload.addressOrLandmark.trim(),
        wasteType: payload.wasteType,
        timeSlot: payload.timeSlot,
        quantity: payload.quantity,
        reporterPhone: payload.reporterPhone?.trim() || undefined,
        gpsLabel: payload.gpsLabel || `${zone.coordinates.lat}, ${zone.coordinates.lng}`,
        photoPreview: payload.photoPreview,
        photoName: payload.photoName,
        notes: payload.notes?.trim() || undefined,
        status: "পেন্ডিং",
        priority:
          payload.priority ??
          (payload.kind === "report" && payload.wasteType.includes("ঝুঁকিপূর্ণ")
            ? "অতি জরুরি"
            : payload.kind === "report"
              ? "জরুরি"
              : "সাধারণ"),
        createdAtLabel: "এইমাত্র",
      };

      setState((prev) => ({
        ...prev,
        requests: [newReq, ...prev.requests],
      }));

      return newReq;
    },
    [state.requests.length, state.zones]
  );

  const assignCollector = useCallback((requestId: string, collectorId: string) => {
    setState((prev) => {
      const collector = prev.collectors.find((c) => c.id === collectorId);
      if (!collector) return prev;
      const targetReq = prev.requests.find((r) => r.id === requestId);
      const wasAlreadyAssignedToSame = targetReq?.assignedCollectorId === collectorId;

      return {
        ...prev,
        requests: prev.requests.map((req) =>
          req.id === requestId
            ? {
                ...req,
                status: req.status === "সংগ্রহ সম্পন্ন" ? "সংগ্রহ সম্পন্ন" : "কালেক্টর পথে আছেন",
                assignedCollectorId: collector.id,
                assignedCollectorName: collector.name,
              }
            : req
        ),
        collectors: prev.collectors.map((col) =>
          col.id === collectorId && !wasAlreadyAssignedToSame
            ? { ...col, status: "মাঠে কর্মরত", activeTasks: col.activeTasks + 1 }
            : col
        ),
      };
    });
  }, []);

  const markRequestCompleted = useCallback((requestId: string) => {
    setState((prev) => {
      const target = prev.requests.find((r) => r.id === requestId);
      if (!target || target.status === "সংগ্রহ সম্পন্ন") return prev;

      return {
        ...prev,
        requests: prev.requests.map((req) =>
          req.id === requestId ? { ...req, status: "সংগ্রহ সম্পন্ন" } : req
        ),
        collectors: prev.collectors.map((col) =>
          col.id === target.assignedCollectorId
            ? {
                ...col,
                activeTasks: Math.max(0, col.activeTasks - 1),
                completedToday: col.completedToday + 1,
              }
            : col
        ),
      };
    });
  }, []);

  const dispatchToHotspot = useCallback((hotspotId: string, collectorId: string) => {
    setState((prev) => {
      const col = prev.collectors.find((c) => c.id === collectorId);
      if (!col) return prev;
      return {
        ...prev,
        hotspots: prev.hotspots.map((hs) =>
          hs.id === hotspotId
            ? {
                ...hs,
                dispatchedTeam: `${col.name} (${col.vehicle})`,
                severity: hs.severity === "অতি জরুরি" ? "জরুরি" : hs.severity,
              }
            : hs
        ),
        collectors: prev.collectors.map((c) =>
          c.id === collectorId ? { ...c, status: "মাঠে কর্মরত", activeTasks: c.activeTasks + 1 } : c
        ),
      };
    });
  }, []);

  const markHotspotCleared = useCallback((hotspotId: string) => {
    setState((prev) => ({
      ...prev,
      hotspots: prev.hotspots.map((hs) =>
        hs.id === hotspotId
          ? { ...hs, clearedToday: true, lastCleared: "এইমাত্র পরিষ্কার", severity: "পর্যবেক্ষণে" }
          : hs
      ),
    }));
  }, []);

  const toggleCollectorStatus = useCallback((collectorId: string) => {
    setState((prev) => ({
      ...prev,
      collectors: prev.collectors.map((col) => {
        if (col.id !== collectorId) return col;
        const nextStatus =
          col.status === "সক্রিয়"
            ? "মাঠে কর্মরত"
            : col.status === "মাঠে কর্মরত"
              ? "বিরতিতে"
              : "সক্রিয়";
        return { ...col, status: nextStatus };
      }),
    }));
  }, []);

  const toggleZoneActive = useCallback((zoneId: string) => {
    setState((prev) => ({
      ...prev,
      zones: prev.zones.map((z) => (z.id === zoneId ? { ...z, active: !z.active } : z)),
    }));
  }, []);

  const updateZoneSchedule = useCallback((zoneId: string, schedule: string) => {
    setState((prev) => ({
      ...prev,
      zones: prev.zones.map((z) => (z.id === zoneId ? { ...z, schedule } : z)),
    }));
  }, []);

  const addRecyclingBatch = useCallback(
    (batch: Omit<RecyclingBatch, "id" | "loggedAt">) => {
      setState((prev) => {
        const nextNum = 205 + Math.max(0, prev.recyclingBatches.length - INITIAL_RECYCLING_BATCHES.length);
        const created: RecyclingBatch = {
          ...batch,
          id: `RC-${nextNum}`,
          loggedAt: "এইমাত্র",
        };
        return {
          ...prev,
          recyclingBatches: [created, ...prev.recyclingBatches],
        };
      });
    },
    []
  );

  const resetDemoData = useCallback(() => {
    setState(DEFAULT_PERSISTED);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
  }, []);

  const kpis = useMemo(() => {
    // Baseline exact metrics requested for Savar operations: 4.8 tons, 24 pending, 89% resolved, 28 active workers
    const totalKg = state.recyclingBatches.reduce((sum, item) => sum + item.weightKg, 0);
    const completedExtra = state.requests.filter((r) => r.status === "সংগ্রহ সম্পন্ন").length - 3;
    const totalCollectedTons = Number((totalKg / 1000 + Math.max(0, completedExtra) * 0.1).toFixed(1));

    const initialPendingInSample = INITIAL_REQUESTS.filter((r) => r.status === "পেন্ডিং").length; // 3
    const currentPendingInSample = state.requests.filter((r) => r.status === "পেন্ডিং").length;
    const pendingRequestsCount = Math.max(0, 24 + (currentPendingInSample - initialPendingInSample));

    const initialReportsCompleted = INITIAL_REQUESTS.filter(
      (r) => r.kind === "report" && r.status === "সংগ্রহ সম্পন্ন"
    ).length;
    const currentReportsCompleted = state.requests.filter(
      (r) => r.kind === "report" && r.status === "সংগ্রহ সম্পন্ন"
    ).length;
    const resolvedComplaintsPercent = Math.min(
      99,
      Math.max(70, 89 + (currentReportsCompleted - initialReportsCompleted) * 2)
    );

    const initialActiveRoster = INITIAL_COLLECTORS.filter((c) => c.status !== "বিরতিতে").length; // 6
    const currentActiveRoster = state.collectors.filter((c) => c.status !== "বিরতিতে").length;
    const activeWorkersCount = Math.max(0, 28 + (currentActiveRoster - initialActiveRoster));

    return {
      totalCollectedTons,
      pendingRequestsCount,
      resolvedComplaintsPercent,
      activeWorkersCount,
    };
  }, [state.collectors, state.recyclingBatches, state.requests]);

  const value = useMemo<CleanSavarContextValue>(
    () => ({
      ...state,
      activeActionTab,
      setActiveActionTab,
      selectedZoneForForm,
      setSelectedZoneForForm,
      actionModalKind,
      openActionModal,
      closeActionModal,
      focusQuickAction,
      submitRequest,
      assignCollector,
      markRequestCompleted,
      dispatchToHotspot,
      markHotspotCleared,
      toggleCollectorStatus,
      toggleZoneActive,
      updateZoneSchedule,
      addRecyclingBatch,
      resetDemoData,
      kpis,
    }),
    [
      state,
      activeActionTab,
      selectedZoneForForm,
      actionModalKind,
      openActionModal,
      closeActionModal,
      focusQuickAction,
      submitRequest,
      assignCollector,
      markRequestCompleted,
      dispatchToHotspot,
      markHotspotCleared,
      toggleCollectorStatus,
      toggleZoneActive,
      updateZoneSchedule,
      addRecyclingBatch,
      resetDemoData,
      kpis,
    ]
  );

  return <CleanSavarContext.Provider value={value}>{children}</CleanSavarContext.Provider>;
}

export function useCleanSavar() {
  const ctx = useContext(CleanSavarContext);
  if (!ctx) {
    throw new Error("useCleanSavar must be used within CleanSavarProvider");
  }
  return ctx;
}
