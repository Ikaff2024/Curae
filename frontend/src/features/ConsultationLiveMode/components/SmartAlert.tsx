import { Sparkles } from 'lucide-react';
import type { SmartAlertData } from '../types';

interface SmartAlertProps {
  alert: SmartAlertData;
  onAction: (actionId: string) => void;
  onDismiss: () => void;
}

export function SmartAlert({ alert, onAction, onDismiss }: SmartAlertProps) {
  const styles = LEVEL_STYLES[alert.level];

  return (
    <div
      className={`rounded-r-md border-l-[3px] p-2.5 ${styles.bg} ${styles.border}`}
      role="alert"
    >
      <div className="flex items-start gap-2">
        <AlertIcon level={alert.level} />
        <div className="min-w-0 flex-1">
          <div className={`text-xs font-medium ${styles.title}`}>
            {alert.title}
          </div>
          <div className={`mt-0.5 text-[11px] leading-relaxed ${styles.body}`}>
            {alert.message}
          </div>

          {(alert.actions?.length ?? 0) > 0 && (
            <div className="mt-1.5 flex items-center gap-1">
              {alert.actions?.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => onAction(action.id)}
                  className={
                    action.primary
                      ? 'rounded bg-teal-700 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-teal-800'
                      : `rounded border border-current bg-white px-2 py-0.5 text-[10px] font-medium ${styles.title} hover:bg-white/60`
                  }
                >
                  {action.label}
                </button>
              ))}
              <button
                type="button"
                onClick={onDismiss}
                className={`px-1 py-0.5 text-[10px] ${styles.body} hover:underline`}
              >
                Ignorer
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const LEVEL_STYLES = {
  info: {
    bg: 'bg-blue-50',
    border: 'border-l-blue-600',
    title: 'text-blue-900',
    body: 'text-blue-800',
  },
  success: {
    bg: 'bg-emerald-50',
    border: 'border-l-emerald-600',
    title: 'text-emerald-900',
    body: 'text-emerald-800',
  },
  warning: {
    bg: 'bg-amber-50',
    border: 'border-l-amber-600',
    title: 'text-amber-900',
    body: 'text-amber-800',
  },
  critical: {
    bg: 'bg-red-50',
    border: 'border-l-red-600',
    title: 'text-red-900',
    body: 'text-red-800',
  },
  suggestion: {
    bg: 'bg-teal-50',
    border: 'border-l-teal-700',
    title: 'text-teal-900',
    body: 'text-teal-800',
  },
} as const;

function AlertIcon({ level }: { level: SmartAlertData['level'] }) {
  if (level === 'suggestion') {
    return (
      <Sparkles
        className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-teal-700"
        strokeWidth={2}
      />
    );
  }

  const colors = {
    info: 'bg-blue-600',
    success: 'bg-emerald-600',
    warning: 'bg-amber-600',
    critical: 'bg-red-600',
  } as const;

  const symbols = {
    info: 'i',
    success: '✓',
    warning: '!',
    critical: '⚠',
  } as const;

  return (
    <div
      className={`mt-0.5 flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-medium text-white ${colors[level]}`}
      aria-hidden="true"
    >
      {symbols[level]}
    </div>
  );
}
