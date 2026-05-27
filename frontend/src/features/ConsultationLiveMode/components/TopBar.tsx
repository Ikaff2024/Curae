import { useEffect, useState } from 'react';
import { ChevronRight, Heart } from 'lucide-react';

interface TopBarProps {
  patientName: string;
  startedAt: string;
  isPaused?: boolean;
  onPause: () => void;
  onEnd: () => void;
}

export function TopBar({
  patientName,
  startedAt,
  isPaused = false,
  onPause,
  onEnd,
}: TopBarProps) {
  const [elapsed, setElapsed] = useState<string>(() =>
    formatElapsed(startedAt)
  );

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setElapsed(formatElapsed(startedAt));
    }, 1000);
    return () => clearInterval(interval);
  }, [startedAt, isPaused]);

  return (
    <header className="flex items-center gap-4 border-b border-slate-200 bg-white px-4 py-2.5">
      <div className="flex items-center gap-2">
        <div className="flex h-[22px] w-[22px] items-center justify-center rounded-md bg-teal-700">
          <Heart className="h-3 w-3 text-white" strokeWidth={2.5} />
        </div>
        <span className="text-sm font-medium text-slate-900">Curaé</span>
      </div>

      <nav
        aria-label="Fil d'Ariane"
        className="flex items-center gap-1.5 text-xs text-slate-500"
      >
        <span>Consultations</span>
        <ChevronRight className="h-2.5 w-2.5 text-slate-400" />
        <span className="font-medium text-slate-900">
          {patientName} — en cours
        </span>
      </nav>

      <div className="ml-auto flex items-center gap-3.5">
        <div
          className="flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-2.5 py-1"
          aria-live="polite"
          aria-label={`Consultation en cours depuis ${elapsed}`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full bg-teal-500 ${
              isPaused ? '' : 'animate-pulse'
            }`}
            aria-hidden="true"
          />
          <span className="font-mono text-xs font-medium text-teal-800">
            {elapsed}
          </span>
        </div>

        <button
          type="button"
          onClick={onPause}
          className="rounded-md border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/30"
        >
          {isPaused ? 'Reprendre' : 'Pause'}
        </button>

        <button
          type="button"
          onClick={onEnd}
          className="rounded-md bg-teal-700 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-teal-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40"
        >
          Terminer →
        </button>
      </div>
    </header>
  );
}

function formatElapsed(startedAt: string): string {
  const start = new Date(startedAt).getTime();
  const diffSec = Math.max(0, Math.floor((Date.now() - start) / 1000));
  const mm = String(Math.floor(diffSec / 60)).padStart(2, '0');
  const ss = String(diffSec % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}
