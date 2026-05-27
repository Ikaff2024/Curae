import { useCallback, useState } from 'react';
import { TopBar } from './components/TopBar';
import { PatientSidebar } from './components/PatientSidebar';
import { VitalsRow } from './components/VitalsRow';
import { ConsultationNotes } from './components/ConsultationNotes';
import { ExamChips } from './components/ExamChips';
import { AIAssistant } from './components/AIAssistant';
import { BottomBar } from './components/BottomBar';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import type { ConsultationLiveModeProps } from './types';

export function ConsultationLiveMode({
  patient,
  session,
  alerts,
  onSaveNotes,
  onAddVital,
  onToggleExam,
  onEndConsultation,
  onPauseConsultation,
  onGenerateReport,
  onAlertAction,
  onAlertDismiss,
}: ConsultationLiveModeProps) {
  const [isPaused, setIsPaused] = useState(session.status === 'paused');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  const handlePause = useCallback(() => {
    setIsPaused((prev) => !prev);
    onPauseConsultation();
  }, [onPauseConsultation]);

  const handleGenerateReport = useCallback(async () => {
    setIsGeneratingReport(true);
    try {
      await onGenerateReport();
    } finally {
      setIsGeneratingReport(false);
    }
  }, [onGenerateReport]);

  useKeyboardShortcuts({
    onSave: () => onSaveNotes(session.notes),
    onGenerateReport: handleGenerateReport,
  });

  return (
    <div className="flex h-screen flex-col bg-slate-50 font-sans text-slate-900">
      <TopBar
        patientName={patient.fullName}
        startedAt={session.startedAt}
        isPaused={isPaused}
        onPause={handlePause}
        onEnd={onEndConsultation}
      />

      <div className="grid flex-1 grid-cols-[240px_1fr_300px] overflow-hidden">
        <PatientSidebar patient={patient} />

        <main className="overflow-y-auto p-4">
          <VitalsRow
            vitals={session.vitals}
            onAdd={() =>
              onAddVital({
                kind: 'temp',
                label: 'Temp.',
                value: '',
                unit: '°C',
              })
            }
          />

          <ConsultationNotes
            initialNotes={session.notes}
            lastSavedAt={session.lastSavedAt}
            onSave={onSaveNotes}
          />

          <ExamChips
            performedExams={session.performedExams}
            onToggle={onToggleExam}
          />
        </main>

        <AIAssistant
          alerts={alerts}
          contextSummary={patient.contextSummary}
          onAlertAction={onAlertAction}
          onAlertDismiss={onAlertDismiss}
        />
      </div>

      <BottomBar
        onGenerateReport={handleGenerateReport}
        isGenerating={isGeneratingReport}
      />
    </div>
  );
}
