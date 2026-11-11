'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface NativeDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  closeOnBackdrop?: boolean;
  children: ReactNode;
}

/**
 * Accessible modal built on the native <dialog> top-layer API (.showModal()).
 * Avoids redundant role="dialog", aria-modal, or manual body overflow locks.
 */
export function NativeDialog({
  open,
  onClose,
  title,
  closeOnBackdrop = true,
  children,
}: NativeDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;

    if (open && !el.open) {
      el.showModal();
    } else if (!open && el.open) {
      el.close();
    }
  }, [open]);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;

    const handleClose = () => {
      el.returnValue = '';
      onClose();
    };

    let pressedOutside = false;
    const isOutside = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (!closeOnBackdrop) return;
      pressedOutside = isOutside(e);
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (!closeOnBackdrop) return;
      if (pressedOutside && isOutside(e)) {
        el.close('backdrop');
      }
      pressedOutside = false;
    };

    el.addEventListener('close', handleClose);
    el.addEventListener('pointerdown', handlePointerDown);
    el.addEventListener('pointerup', handlePointerUp);

    return () => {
      el.removeEventListener('close', handleClose);
      el.removeEventListener('pointerdown', handlePointerDown);
      el.removeEventListener('pointerup', handlePointerUp);
    };
  }, [closeOnBackdrop, onClose]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className="cs-dialog"
      {...(closeOnBackdrop ? ({ closedby: 'any' } as Record<string, string>) : {})}
    >
      <div className="flex items-center justify-between border-b border-[#E2E8F0] px-5 py-4">
        <h2 id={titleId} className="text-lg font-semibold text-[#0F172A]">
          {title}
        </h2>
        <button
          type="button"
          onClick={() => dialogRef.current?.close('close-button')}
          aria-label="বন্ধ করুন"
          className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-md border border-[#E2E8F0] bg-white text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <div className="p-5">{children}</div>
    </dialog>
  );
}
