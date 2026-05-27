import { useEffect } from 'react';

interface ShortcutMap {
  onSave?: () => void;
  onGenerateReport?: () => void;
  onOpenSearch?: () => void;
}

export function useKeyboardShortcuts({
  onSave,
  onGenerateReport,
  onOpenSearch,
}: ShortcutMap) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const modifier = e.metaKey || e.ctrlKey;
      if (!modifier) return;

      const target = e.target as HTMLElement | null;
      const isEditing =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable;

      if (e.key.toLowerCase() === 's' && onSave) {
        e.preventDefault();
        onSave();
        return;
      }

      if (e.key === 'Enter' && onGenerateReport) {
        e.preventDefault();
        onGenerateReport();
        return;
      }

      if (e.key.toLowerCase() === 'k' && onOpenSearch && !isEditing) {
        e.preventDefault();
        onOpenSearch();
        return;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onSave, onGenerateReport, onOpenSearch]);
}
