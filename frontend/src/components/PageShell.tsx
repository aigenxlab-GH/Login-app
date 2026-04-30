import { ReactNode } from 'react';

function Cloud({ className }: { className: string }) {
  return (
    <div className={`pointer-events-none absolute ${className}`}>
      <div className="relative h-full w-full">
        <div className="absolute inset-0 rounded-full bg-white" />
        <div className="absolute -top-1/3 left-1/4 h-3/4 w-2/5 rounded-full bg-white" />
        <div className="absolute -top-1/4 left-1/2 h-2/3 w-1/3 rounded-full bg-white" />
      </div>
    </div>
  );
}

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-sky-400 px-4 py-12">
      <Cloud className="opacity-60 left-[-60px] top-10 h-36 w-72" />
      <Cloud className="opacity-50 right-[-40px] top-6 h-28 w-56" />
      <Cloud className="opacity-40 bottom-16 left-10 h-24 w-48" />
      <Cloud className="opacity-40 bottom-8 right-8 h-20 w-44" />
      <Cloud className="opacity-30 left-1/4 top-4 h-20 w-40" />
      <div className="relative z-10 w-full">{children}</div>
    </div>
  );
}
