import React from 'react';

export function SubpageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      {children}
    </div>
  );
}
