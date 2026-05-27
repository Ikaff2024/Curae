# ConsultationLiveMode

Écran principal de consultation médicale en mode "live" pour Curaé.

## Utilisation

```tsx
import { ConsultationLiveMode } from '@/features/ConsultationLiveMode';

<ConsultationLiveMode
  patient={patient}
  session={session}
  alerts={alerts}
  onSaveNotes={...}
  onAddVital={...}
  onToggleExam={...}
  onPauseConsultation={...}
  onEndConsultation={...}
  onGenerateReport={...}
  onAlertAction={...}
  onAlertDismiss={...}
/>
```

Voir `src/pages/ConsultationPageExample.tsx` pour un exemple complet avec données mockées.

## Dépendances

- React 18+
- lucide-react
- Tailwind CSS 3+
