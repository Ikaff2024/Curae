import { useState } from 'react';
import {
  ConsultationLiveMode,
  type ConsultationSession,
  type Patient as CLPatient,
  type SmartAlertData,
} from '../features/ConsultationLiveMode';
import type { Patient } from '../types';

function calculerAge(dateNaissance: string): number {
  const naissance = new Date(dateNaissance);
  const aujourd = new Date();
  let age = aujourd.getFullYear() - naissance.getFullYear();
  const m = aujourd.getMonth() - naissance.getMonth();
  if (m < 0 || (m === 0 && aujourd.getDate() < naissance.getDate())) age--;
  return age;
}

function toConsultationPatient(p: Patient): CLPatient {
  const age = calculerAge(p.dateNaissance);
  return {
    id: p.id,
    reference: p.numeroDossier,
    fullName: `${p.nom} ${p.prenoms}`,
    initials: `${p.nom[0]}${p.prenoms[0]}`,
    sex: p.sexe,
    ageYears: age,
    consultationType: 'follow_up',
    history: p.antecedents
      ? [{ id: 'h1', label: p.antecedents, severity: 'warning' as const }]
      : [],
    medications: [],
    timeline: p.dernierRdv
      ? [
          {
            id: 'tl1',
            type: 'consultation' as const,
            title: 'Dernière consultation',
            date: p.dernierRdv,
            isHighlighted: true,
          },
        ]
      : [],
    contextSummary: p.antecedents
      ? `${p.prenoms} ${p.nom}, ${age} ans. ${p.antecedents}`
      : undefined,
  };
}

function makeSession(patientId: string): ConsultationSession {
  return {
    id: `cons_${Date.now()}`,
    patientId,
    status: 'in_progress',
    startedAt: new Date().toISOString(),
    notes: '',
    vitals: [],
    performedExams: [],
  };
}

const INITIAL_ALERTS: SmartAlertData[] = [
  {
    id: 'a1',
    level: 'info',
    title: 'Consultation démarrée',
    message: "L'assistant surveille les constantes et vous alertera en cas d'anomalie.",
  },
];

interface ConsultationPageProps {
  patient: Patient;
  onEnd: () => void;
}

export default function ConsultationPage({ patient, onEnd }: ConsultationPageProps) {
  const clPatient = toConsultationPatient(patient);
  const [session, setSession] = useState<ConsultationSession>(() => makeSession(patient.id));
  const [alerts, setAlerts] = useState<SmartAlertData[]>(INITIAL_ALERTS);

  return (
    <ConsultationLiveMode
      patient={clPatient}
      session={session}
      alerts={alerts}
      onSaveNotes={async (notes) => {
        setSession((prev) => ({
          ...prev,
          notes,
          lastSavedAt: new Date().toISOString(),
        }));
      }}
      onAddVital={(vital) => {
        setSession((prev) => ({
          ...prev,
          vitals: [
            ...prev.vitals,
            {
              ...vital,
              id: crypto.randomUUID(),
              status: 'normal',
              measuredAt: new Date().toISOString(),
            },
          ],
        }));
      }}
      onToggleExam={(examType) => {
        setSession((prev) => {
          const exists = prev.performedExams.some((e) => e.type === examType);
          return {
            ...prev,
            performedExams: exists
              ? prev.performedExams.filter((e) => e.type !== examType)
              : [
                  ...prev.performedExams,
                  { type: examType, performedAt: new Date().toISOString() },
                ],
          };
        });
      }}
      onPauseConsultation={() => {
        setSession((prev) => ({
          ...prev,
          status: prev.status === 'paused' ? 'in_progress' : 'paused',
        }));
      }}
      onEndConsultation={onEnd}
      onGenerateReport={async () => {
        await new Promise((r) => setTimeout(r, 1500));
      }}
      onAlertAction={(alertId) => {
        setAlerts((prev) => prev.filter((a) => a.id !== alertId));
      }}
      onAlertDismiss={(alertId) => {
        setAlerts((prev) => prev.filter((a) => a.id !== alertId));
      }}
    />
  );
}
