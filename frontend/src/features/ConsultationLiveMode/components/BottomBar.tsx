import { Sparkles } from 'lucide-react';
import { KEYBOARD_SHORTCUTS } from '../constants';

interface BottomBarProps {
  onGenerateReport: () => void;
  isGenerating?: boolean;
}

export function BottomBar({
  onGenerateReport,
  isGenerating = false,
}: BottomBarProps) {
  return (
    <footer className="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-2.5">
      <div className="flex items-center gap-3">
        {Object.entries(KEYBOARD_SHORTCUTS).map(([key, shortcut]) => (
          <ShortcutHint
            key={key}
            keys={[...shortcut.keys]}
            label={shortcut.label}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={onGenerateReport}
        disabled={isGenerating}
        className="inline-flex items-center gap-1.5 rounded-md bg-teal-700 px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-teal-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40 disabled:cursor-progress disabled:opacity-80"
      >
        {isGenerating ? (
          <>
            <Spinner />
            Génération…
          </>
        ) : (
          <>
            <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />
            Générer le compte-rendu
          </>
        )}
      </button>
    </footer>
  );
}

function ShortcutHint({ keys, label }: { keys: string[]; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
      <kbd className="rounded border border-slate-300 bg-slate-100 px-1.5 py-0.5 font-mono text-[10px]">
        {keys.join('')}
      </kbd>
      <span>{label}</span>
    </div>
  );
}

function Spinner() {
  return (
    <span
      className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"
      aria-label="Chargement"
    />
  );
}
