import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors cursor-pointer disabled:pointer-events-none disabled:opacity-50 select-none',
  {
    variants: {
      variant: {
        primary: 'bg-[#15803D] text-white hover:bg-[#14532D] border border-[#15803D]',
        secondary:
          'bg-white text-[#0F172A] border border-[#CBD5E1] hover:bg-[#F8FAFC] hover:border-[#94A3B8]',
        tint: 'bg-[#F0FDF4] text-[#14532D] border border-[#BBF7D0] hover:bg-[#DCFCE7]',
        danger: 'bg-[#DC2626] text-white hover:bg-[#B91C1C] border border-[#DC2626]',
        ghost: 'bg-transparent text-[#475569] hover:bg-[#F1F5F9] hover:text-[#0F172A] border border-transparent',
      },
      size: {
        sm: 'min-h-9 px-3 py-1.5 text-sm',
        md: 'min-h-11 px-4 py-2 text-sm',
        lg: 'min-h-12 px-5 py-2.5 text-base',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = 'button', ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';
