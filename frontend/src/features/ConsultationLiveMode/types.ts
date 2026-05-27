/**
 * Types du module Consultation Live Mode
 * À synchroniser avec INTERFACE_CONTRACT.md côté backend.
 */

export type ConsultationType =
  | 'first_visit'
  | 'follow_up'
  | 'emergency'
  | 'annual_checkup';

export type ConsultationStatus =
  | 'scheduled'
  | 'in_progress'
  | 'paused'
  | 'completed'
  | 'cancelled';

export type ExamType =
  | 'ecg'
  | 'echocardiography'
  | 'stress_test'
  | 'holter_rhythm'
  | 'mapa'
  | 'doppler';

export type Sex = 'M' | 'F';

export type VitalStatus = 'normal' | 'warning' | 'critical';

export interface Vital {
  id: string;
  kind: 'bp' | 'hr' | 'spo2' | 'weight' | 'height' | 'temp';
  label: string;
  value: string;
  unit: string;
  status: VitalStatus;
  trend?: {
    direction: 'up' | 'down' | 'stable';
    delta?: string;
  };
  measuredAt: string;
}

export interface MedicalHistory {
  id: string;
  label: string;
  detail?: string;
  severity: 'critical' | 'warning' | 'info';
  since?: string;
}

export interface ActiveMedication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
}

export interface TimelineEvent {
  id: string;
  type: 'consultation' | 'exam' | 'prescription' | 'event';
  title: string;
  date: string;
  summary?: string;
  isHighlighted?: boolean;
}

export interface Patient {
  id: string;
  reference: string;
  fullName: string;
  initials: string;
  sex: Sex;
  ageYears: number;
  weightKg?: number;
  consultationType: ConsultationType;
  history: MedicalHistory[];
  medications: ActiveMedication[];
  timeline: TimelineEvent[];
  contextSummary?: string;
}

export type NoteTag =
  | 'motif'
  | 'examen'
  | 'note'
  | 'diagnostic'
  | 'prescription';

export interface PerformedExam {
  type: ExamType;
  performedAt: string;
  result?: string;
}

export interface SmartAlertData {
  id: string;
  level: 'info' | 'success' | 'warning' | 'critical' | 'suggestion';
  title: string;
  message: string;
  actions?: Array<{
    id: string;
    label: string;
    primary?: boolean;
  }>;
}

export interface ConsultationSession {
  id: string;
  patientId: string;
  status: ConsultationStatus;
  startedAt: string;
  notes: string;
  vitals: Vital[];
  performedExams: PerformedExam[];
  lastSavedAt?: string;
}

export interface ConsultationLiveModeProps {
  patient: Patient;
  session: ConsultationSession;
  alerts: SmartAlertData[];
  onSaveNotes: (notes: string) => Promise<void>;
  onAddVital: (vital: Omit<Vital, 'id' | 'status' | 'measuredAt'>) => void;
  onToggleExam: (exam: ExamType) => void;
  onEndConsultation: () => void;
  onPauseConsultation: () => void;
  onGenerateReport: () => void;
  onAlertAction: (alertId: string, actionId: string) => void;
  onAlertDismiss: (alertId: string) => void;
}
