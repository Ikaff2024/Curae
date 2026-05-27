import { useEffect, useRef, useState } from 'react';
import { Mic } from 'lucide-react';
import type { NoteTag } from '../types';
import { AUTOSAVE_DEBOUNCE_MS, NOTE_TAG_LABELS } from '../constants';

interface ConsultationNotesProps {
  initialNotes: string;
  lastSavedAt?: string;
  onSave: (notes: string) => Promise<void>;
  onStartDictation?: () => void;
}

export function ConsultationNotes({
  initialNotes,
  lastSavedAt,
  onSave,
  onStartDictation,
}: ConsultationNotesProps) {
  const [notes, setNotes] = useState(initialNotes);
  const [saveStatus, setSaveStatus] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (notes === initialNotes) return;
    if (saveTimeout.current) clearTimeout(saveTimeout.current);

    setSaveStatus('idle');
    saveTimeout.current = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        await onSave(notes);
        setSaveStatus('saved');
      } catch {
        setSaveStatus('error');
      }
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [notes, initialNotes, onSave]);

  const insertTag = (tag: NoteTag) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const insertion = `\n${NOTE_TAG_LABELS[tag]} : `;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const next = notes.slice(0, start) + insertion + notes.slice(end);
    setNotes(next);

    requestAnimationFrame(() => {
      textarea.focus();
      const pos = start + insertion.length;
      textarea.setSelectionRange(pos, pos);
    });
  };

  return (
    <section className="mb-4">
      <div className="mb-2 flex items-center justify-between">
        <label
          htmlFor="consultation-notes"
          className="text-[11px] uppercase tracking-wide text-slate-500"
        >
          Notes de consultation
        </label>
        <SaveStatusBadge status={saveStatus} lastSavedAt={lastSavedAt} />
      </div>

      <textarea
        ref={textareaRef}
        id="consultation-notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Patient se plaint de…"
        className="min-h-[200px] w-full resize-y rounded-lg border border-slate-200 bg-white p-3.5 text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-4 focus:ring-teal-500/10"
      />

      <div className="mt-2 flex flex-wrap gap-1.5">
        {(Object.keys(NOTE_TAG_LABELS) as NoteTag[]).map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => insertTag(tag)}
            className="rounded border border-slate-300 bg-white px-2.5 py-1 text-[11px] text-slate-600 transition-colors hover:border-slate-400 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/30"
          >
            + {NOTE_TAG_LABELS[tag]}
          </button>
        ))}

        {onStartDictation && (
          <button
            type="button"
            onClick={onStartDictation}
            className="ml-auto inline-flex items-center gap-1 rounded border border-teal-200 bg-white px-2.5 py-1 text-[11px] text-teal-700 transition-colors hover:bg-teal-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/30"
          >
            <Mic className="h-3 w-3" strokeWidth={2} />
            Dictée vocale
          </button>
        )}
      </div>
    </section>
  );
}

function SaveStatusBadge({
  status,
  lastSavedAt,
}: {
  status: 'idle' | 'saving' | 'saved' | 'error';
  lastSavedAt?: string;
}) {
  if (status === 'error') {
    return (
      <span className="flex items-center gap-1 text-[10px] text-red-600">
        <span className="h-1.5 w-1.5 rounded-full bg-red-600" />
        Échec de la sauvegarde
      </span>
    );
  }

  if (status === 'saving') {
    return (
      <span className="flex items-center gap-1 text-[10px] text-slate-500">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-400" />
        Sauvegarde…
      </span>
    );
  }

  if (status === 'saved' || (status === 'idle' && lastSavedAt)) {
    return (
      <span className="flex items-center gap-1 text-[10px] text-emerald-600">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
        Sauvegardé
        {lastSavedAt && status !== 'saved' && (
          <span className="text-slate-400"> · {timeAgo(lastSavedAt)}</span>
        )}
      </span>
    );
  }

  return null;
}

function timeAgo(iso: string): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (diffSec < 60) return `il y a ${diffSec} s`;
  if (diffSec < 3600) return `il y a ${Math.floor(diffSec / 60)} min`;
  return `il y a ${Math.floor(diffSec / 3600)} h`;
}
