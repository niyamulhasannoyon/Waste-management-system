'use client';

import React, { useState, useEffect } from 'react';
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  MapPin,
  Maximize2,
  Minimize2,
  RotateCw,
  X,
} from 'lucide-react';
import { toBanglaDigits } from '@/lib/utils';

export interface PhotoLightboxData {
  title: string;
  trackingCode: string;
  landmark?: string;
  wardNameBn?: string;
  photoUrls: string[];
  initialIndex?: number;
}

interface AdminPhotoLightboxModalProps {
  data: PhotoLightboxData | null;
  onClose: () => void;
}

export function AdminPhotoLightboxModal({ data, onClose }: AdminPhotoLightboxModalProps) {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [rotation, setRotation] = useState<number>(0);
  const [isZoomed, setIsZoomed] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (data) {
      setCurrentIndex(data.initialIndex ?? 0);
      setRotation(0);
      setIsZoomed(false);
      setLoadError({});
    }
  }, [data]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!data) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && data.photoUrls.length > 1) {
        setCurrentIndex((prev) => (prev + 1) % data.photoUrls.length);
        setRotation(0);
      }
      if (e.key === 'ArrowLeft' && data.photoUrls.length > 1) {
        setCurrentIndex((prev) => (prev - 1 + data.photoUrls.length) % data.photoUrls.length);
        setRotation(0);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [data, onClose]);

  if (!data || data.photoUrls.length === 0) return null;

  const currentUrl = data.photoUrls[currentIndex] || '';
  const total = data.photoUrls.length;

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + total) % total);
    setRotation(0);
    setIsZoomed(false);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % total);
    setRotation(0);
    setIsZoomed(false);
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="lightbox-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-2 sm:p-4 backdrop-blur-md animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative flex max-h-[96vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 text-white shadow-2xl">
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between border-b border-slate-800 bg-slate-950/80 px-4 py-3 sm:px-6">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded bg-emerald-950 border border-emerald-600 px-2 py-0.5 font-metric text-xs font-bold text-emerald-400">
                <Camera className="h-3 w-3" />
                {data.trackingCode}
              </span>
              <span className="text-xs font-medium text-slate-400">
                ছবি {toBanglaDigits(currentIndex + 1)} / {toBanglaDigits(total)}
              </span>
            </div>
            <h2 id="lightbox-title" className="text-sm sm:text-base font-bold text-slate-100 truncate max-w-md sm:max-w-xl">
              {data.title}
            </h2>
            {data.landmark ? (
              <p className="flex items-center gap-1 text-xs text-slate-400">
                <MapPin className="h-3 w-3 text-emerald-500 shrink-0" />
                <span>{data.wardNameBn ? `${data.wardNameBn} — ` : ''}{data.landmark}</span>
              </p>
            ) : null}
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={handleRotate}
              title="ছবি ঘোরান (Rotate 90°)"
              className="rounded-lg bg-slate-800 p-2 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            >
              <RotateCw className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsZoomed(!isZoomed)}
              title={isZoomed ? 'স্বাভাবিক আকার' : 'জুম করুন'}
              className="rounded-lg bg-slate-800 p-2 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            >
              {isZoomed ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
            {currentUrl ? (
              <a
                href={currentUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="নতুন ট্যাবে পূর্ণ ছবি দেখুন"
                className="rounded-lg bg-slate-800 p-2 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              title="বন্ধ করুন (Esc)"
              className="rounded-lg bg-rose-950/80 border border-rose-700 p-2 text-rose-300 hover:bg-rose-900 hover:text-white transition-colors ml-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Main Photo Viewport */}
        <div className="relative flex flex-1 items-center justify-center overflow-auto bg-black/60 p-2 sm:p-6 min-h-[320px] max-h-[68vh]">
          {/* Previous Button */}
          {total > 1 ? (
            <button
              type="button"
              onClick={handlePrev}
              title="পূর্ববর্তী ছবি (←)"
              className="absolute left-3 z-10 rounded-full bg-slate-900/80 border border-slate-700 p-2.5 text-white hover:bg-slate-800 hover:scale-105 transition-all shadow-lg"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          ) : null}

          {/* Image Container with rotation & zoom */}
          <div
            className={`transition-all duration-200 flex items-center justify-center ${
              isZoomed ? 'scale-125 sm:scale-150 cursor-zoom-out' : 'cursor-zoom-in'
            }`}
            style={{ transform: `rotate(${rotation}deg)` }}
            onClick={() => setIsZoomed(!isZoomed)}
          >
            {loadError[currentUrl] ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-2">
                <Camera className="h-10 w-10 text-slate-600" />
                <p className="text-xs font-semibold text-slate-300">
                  ছবিটি সরাসরি লোড করা যায়নি
                </p>
                <a
                  href={currentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded bg-slate-800 px-3 py-1.5 text-xs text-emerald-400 hover:bg-slate-700"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  ক্লাউড স্টোরেজে ছবি দেখুন
                </a>
              </div>
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={currentUrl}
                alt={`${data.title} - ছবি ${currentIndex + 1}`}
                className="max-h-[60vh] max-w-full rounded-lg object-contain shadow-2xl select-none"
                onError={() => {
                  setLoadError((prev) => ({ ...prev, [currentUrl]: true }));
                }}
              />
            )}
          </div>

          {/* Next Button */}
          {total > 1 ? (
            <button
              type="button"
              onClick={handleNext}
              title="পরবর্তী ছবি (→)"
              className="absolute right-3 z-10 rounded-full bg-slate-900/80 border border-slate-700 p-2.5 text-white hover:bg-slate-800 hover:scale-105 transition-all shadow-lg"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          ) : null}
        </div>

        {/* Thumbnail Navigation Strip */}
        {total > 1 ? (
          <div className="flex items-center justify-center gap-2 border-t border-slate-800 bg-slate-950/90 p-2.5 overflow-x-auto">
            {data.photoUrls.map((url, idx) => {
              const active = idx === currentIndex;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setCurrentIndex(idx);
                    setRotation(0);
                    setIsZoomed(false);
                  }}
                  className={`relative h-12 w-16 overflow-hidden rounded-md border-2 transition-all shrink-0 ${
                    active
                      ? 'border-emerald-500 scale-105 shadow-md shadow-emerald-950'
                      : 'border-slate-700 opacity-60 hover:opacity-100'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`থাম্বনেইল ${idx + 1}`}
                    className="h-full w-full object-cover"
                  />
                  <span className="absolute bottom-0 right-0 bg-black/80 px-1 text-[9px] font-metric text-white">
                    {idx + 1}
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
