import type { ConsultationType, ExamType, NoteTag } from './types';

export const CONSULTATION_TYPE_LABELS: Record<ConsultationType, string> = {
  first_visit: '1ère visite',
  follow_up: 'Suivi',
  emergency: 'Urgence',
  annual_checkup: 'Bilan annuel',
};

export const EXAM_DEFINITIONS: Record<
  ExamType,
  { label: string; shortLabel: string; durationMin: number }
> = {
  ecg: { label: 'Électrocardiogramme', shortLabel: 'ECG', durationMin: 5 },
  echocardiography: {
    label: 'Échographie cardiaque',
    shortLabel: 'Échographie',
    durationMin: 25,
  },
  stress_test: {
    label: "Test d'effort",
    shortLabel: "Test d'effort",
    durationMin: 30,
  },
  holter_rhythm: {
    label: 'Holter rythmique 24h',
    shortLabel: 'Holter rythmique',
    durationMin: 10,
  },
  mapa: {
    label: 'MAPA - Holter tensionnel',
    shortLabel: 'MAPA',
    durationMin: 10,
  },
  doppler: {
    label: 'Doppler vasculaire',
    shortLabel: 'Doppler',
    durationMin: 20,
  },
};

export const NOTE_TAG_LABELS: Record<NoteTag, string> = {
  motif: 'Motif',
  examen: 'Examen',
  note: 'À noter',
  diagnostic: 'Diagnostic',
  prescription: 'Prescription',
};

export const VITAL_THRESHOLDS = {
  bpSystolic: { normalMax: 140, warningMax: 160 },
  bpDiastolic: { normalMax: 90, warningMax: 100 },
  hr: { normalMin: 50, normalMax: 100, warningMin: 40, warningMax: 120 },
  spo2: { normalMin: 95, warningMin: 92 },
} as const;

export const AUTOSAVE_DEBOUNCE_MS = 1500;

export const KEYBOARD_SHORTCUTS = {
  search: { keys: ['⌘', 'K'], label: 'Recherche rapide' },
  save: { keys: ['⌘', 'S'], label: 'Sauvegarder' },
  generateReport: { keys: ['⌘', '↵'], label: 'Compte-rendu' },
} as const;
