import type { ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FormFieldProps {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  error?: string | null;
  className?: string;
  children: (props: {
    id: string;
    'aria-describedby'?: string;
    'aria-invalid': 'true' | 'false';
  }) => ReactNode;
}

/**
 * Accessible form field wrapper:
 * - Places hint above the control so mobile keyboards and autofill popovers don't obscure it.
 * - Includes the error id in aria-describedby ONLY while an error is actively shown.
 */
export function FormField({
  id,
  label,
  required,
  hint,
  error,
  className,
  children,
}: FormFieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = `${id}-error`;
  const hasError = Boolean(error);

  const describedBy = [hintId, hasError ? errorId : undefined].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn('flex flex-col items-start gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-semibold text-[#0F172A]">
        {label}
        {required ? (
          <span aria-hidden="true" className="ms-1 text-[#DC2626]">
            *
          </span>
        ) : null}
      </label>

      {hint ? (
        <span id={hintId} className="text-xs text-[#475569]">
          {hint}
        </span>
      ) : null}

      {children({
        id,
        'aria-describedby': describedBy,
        'aria-invalid': hasError ? 'true' : 'false',
      })}

      {hasError ? (
        <p
          id={errorId}
          className="mt-0.5 inline-flex items-center gap-1.5 text-xs font-medium text-[#DC2626]"
        >
          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}
