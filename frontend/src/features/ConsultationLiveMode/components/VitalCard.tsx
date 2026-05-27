import type { Vital } from '../types';

interface VitalCardProps {
  vital: Vital;
}

export function VitalCard({ vital }: VitalCardProps) {
  const isWarning = vital.status === 'warning';
  const isCritical = vital.status === 'critical';

  const containerClasses = [
    'rounded-lg border bg-white p-2.5',
    isCritical
      ? 'border-red-300'
      : isWarning
        ? 'border-amber-300'
        : 'border-slate-200',
  ].join(' ');

  return (
    <div className={containerClasses}>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[10px] uppercase text-slate-500">
          {vital.label}
        </span>
        <TrendIndicator vital={vital} />
      </div>
      <div className="text-lg font-medium leading-none text-slate-900">
        {renderValue(vital.value)}
      </div>
      <div className="mt-0.5 text-[9px] text-slate-400">{vital.unit}</div>
    </div>
  );
}

function renderValue(raw: string) {
  if (raw.includes('/')) {
    const [a, b] = raw.split('/');
    return (
      <>
        {a}
        <span className="text-slate-400">/</span>
        {b}
      </>
    );
  }
  return raw;
}

function TrendIndicator({ vital }: { vital: Vital }) {
  if (vital.status === 'critical') {
    return <span className="text-[9px] text-red-600">⚠</span>;
  }
  if (vital.status === 'warning') {
    return <span className="text-[9px] text-amber-600">▲</span>;
  }
  if (vital.trend?.direction === 'up' && vital.trend.delta) {
    return (
      <span className="text-[9px] text-slate-400">+{vital.trend.delta}</span>
    );
  }
  if (vital.trend?.direction === 'down' && vital.trend.delta) {
    return (
      <span className="text-[9px] text-slate-400">−{vital.trend.delta}</span>
    );
  }
  return <span className="text-[9px] text-emerald-600">●</span>;
}
