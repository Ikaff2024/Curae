import { Calendar, FileText, MessageCircle, Sparkles } from 'lucide-react';
import type { SmartAlertData } from '../types';
import { SmartAlert } from './SmartAlert';

interface AIAssistantProps {
  alerts: SmartAlertData[];
  contextSummary?: string;
  onAlertAction: (alertId: string, actionId: string) => void;
  onAlertDismiss: (alertId: string) => void;
  onViewFullRecord?: () => void;
  onScheduleFollowUp?: () => void;
  onSendWhatsAppPrescription?: () => void;
}

export function AIAssistant({
  alerts,
  contextSummary,
  onAlertAction,
  onAlertDismiss,
  onViewFullRecord,
  onScheduleFollowUp,
  onSendWhatsAppPrescription,
}: AIAssistantProps) {
  return (
    <aside
      className="overflow-y-auto border-l border-slate-200 bg-white p-3.5"
      aria-label="Assistant intelligent Curaé"
    >
      <div className="mb-3.5 flex items-center gap-1.5">
        <Sparkles className="h-3.5 w-3.5 text-teal-700" strokeWidth={2} />
        <span className="text-[13px] font-medium text-slate-900">
          Assistant Curaé
        </span>
      </div>

      {alerts.length > 0 ? (
        <div className="mb-3.5 space-y-1.5">
          {alerts.map((alert) => (
            <SmartAlert
              key={alert.id}
              alert={alert}
              onAction={(actionId) => onAlertAction(alert.id, actionId)}
              onDismiss={() => onAlertDismiss(alert.id)}
            />
          ))}
        </div>
      ) : (
        <EmptyAlerts />
      )}

      {contextSummary && (
        <div className="mb-3.5 rounded-lg border border-slate-200 bg-slate-50 p-2.5">
          <div className="mb-1.5 text-[10px] uppercase tracking-wide text-slate-500">
            Contexte rapide
          </div>
          <div className="text-[11px] leading-relaxed text-slate-700">
            {contextSummary}
          </div>
        </div>
      )}

      <div>
        <div className="mb-1.5 text-[10px] uppercase tracking-wide text-slate-500">
          Actions rapides
        </div>
        <div className="space-y-1">
          {onViewFullRecord && (
            <QuickAction
              icon={<FileText className="h-3.5 w-3.5" strokeWidth={1.75} />}
              label="Voir dossier complet"
              onClick={onViewFullRecord}
            />
          )}
          {onScheduleFollowUp && (
            <QuickAction
              icon={<Calendar className="h-3.5 w-3.5" strokeWidth={1.75} />}
              label="Programmer un suivi"
              onClick={onScheduleFollowUp}
            />
          )}
          {onSendWhatsAppPrescription && (
            <QuickAction
              icon={
                <MessageCircle className="h-3.5 w-3.5" strokeWidth={1.75} />
              }
              label="Envoyer ordonnance WhatsApp"
              onClick={onSendWhatsAppPrescription}
            />
          )}
        </div>
      </div>
    </aside>
  );
}

function QuickAction({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-left text-xs text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/30"
    >
      <span className="text-slate-600">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function EmptyAlerts() {
  return (
    <div className="mb-3.5 rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center">
      <div className="text-[11px] text-slate-500">
        Aucune alerte. L'assistant vous prévient si une anomalie est détectée
        pendant la consultation.
      </div>
    </div>
  );
}
