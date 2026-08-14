import type { ReparaturWartung, Werkzeuge, Handwerker } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';

export interface ReparaturWartungDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: ReparaturWartung;
  /** N:1-Ziel „Werkzeuge": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  werkzeugeList: Werkzeuge[];
  /** Klick auf die Werkzeuge-Relation → overlay.push auf dessen Detail. */
  onOpenWerkzeuge?: (record: Werkzeuge) => void;
  /** N:1-Ziel „Handwerker": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  handwerkerList: Handwerker[];
  /** Klick auf die Handwerker-Relation → overlay.push auf dessen Detail. */
  onOpenHandwerker?: (record: Handwerker) => void;
}

export function ReparaturWartungDetails({
  record,
  werkzeugeList,
  onOpenWerkzeuge,
  handwerkerList,
  onOpenHandwerker,
}: ReparaturWartungDetailsProps) {
  const werkzeugTarget = werkzeugeList.find(r => r.record_id === extractRecordId(record.fields.werkzeug));
  const verantwortlicher_handwerkerTarget = handwerkerList.find(r => r.record_id === extractRecordId(record.fields.verantwortlicher_handwerker));
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('reparatur_wartung', 'art')} value={record.fields.art} format="pill" />
        <RecordField label={fieldLabel('reparatur_wartung', 'beschreibung')} value={record.fields.beschreibung} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('reparatur_wartung', 'startdatum')} value={record.fields.startdatum} format="date" />
        <RecordField label={fieldLabel('reparatur_wartung', 'enddatum')} value={record.fields.enddatum} format="date" />
        <RecordField label={fieldLabel('reparatur_wartung', 'status')} value={record.fields.status} format="pill" />
        <RecordField label={fieldLabel('reparatur_wartung', 'kosten')} value={record.fields.kosten} format="text" />
        <RecordField label={fieldLabel('reparatur_wartung', 'bemerkungen')} value={record.fields.bemerkungen} format="longtext" className="md:col-span-2" />
      </RecordSection>

      {/* N:1 — verknüpfte Records: IMMER klickbar, nie eine Text-Sackgasse. */}
      <RecordSection title={t('relations')} cols={2}>
        <RecordRelation
          label={fieldLabel('reparatur_wartung', 'werkzeug')}
          name={werkzeugTarget?.fields.werkzeugname ?? '—'}
          meta={[werkzeugTarget?.fields.inventarnummer, werkzeugTarget?.fields.hersteller].filter(Boolean).join(' · ') || undefined}
          onClick={werkzeugTarget && onOpenWerkzeuge ? () => onOpenWerkzeuge!(werkzeugTarget!) : undefined}
        />
        <RecordRelation
          label={fieldLabel('reparatur_wartung', 'verantwortlicher_handwerker')}
          name={verantwortlicher_handwerkerTarget?.fields.vorname ?? '—'}
          meta={[verantwortlicher_handwerkerTarget?.fields.telefon, verantwortlicher_handwerkerTarget?.fields.email].filter(Boolean).join(' · ') || undefined}
          onClick={verantwortlicher_handwerkerTarget && onOpenHandwerker ? () => onOpenHandwerker!(verantwortlicher_handwerkerTarget!) : undefined}
        />
      </RecordSection>

      <RecordAttachments appId={APP_IDS.REPARATUR_WARTUNG} recordId={record.record_id} />
    </>
  );
}
