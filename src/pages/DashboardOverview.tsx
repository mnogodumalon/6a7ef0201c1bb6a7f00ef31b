import { useState, useMemo, useCallback } from 'react';
import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichAusleihe, enrichReparaturWartung } from '@/lib/enrich';
import type { EnrichedAusleihe, EnrichedReparaturWartung } from '@/types/enriched';
import type { Handwerker, Werkzeuge, Ausleihe, ReparaturWartung } from '@/types/app';
import { APP_IDS, LOOKUP_OPTIONS, lookupOption } from '@/types/app';
import { LivingAppsService, extractRecordId } from '@/services/livingAppsService';
import { formatDate, lookupKey } from '@/lib/formatters';
import { DashboardSkeleton, DashboardError } from '@/components/DashboardStates';
import { DashboardGrid } from '@/components/DashboardGrid';
import { StatStrip, StatStripItem } from '@/components/StatCard';
import { WorkList } from '@/components/WorkList';
import { HeroBanner } from '@/components/HeroBanner';
import { KanbanWidget, type KanbanCard, type KanbanColumn, type KanbanTone } from '@/components/widgets/KanbanWidget';
import {
  useRecordOverlayStack,
  RecordOverlayHost,
  RecordHeader,
} from '@/components/widgets/RecordView';
import { AusleiheDetails } from '@/components/details/AusleiheDetails';
import { HandwerkerDetails } from '@/components/details/HandwerkerDetails';
import { WerkzeugeDetails } from '@/components/details/WerkzeugeDetails';
import { ReparaturWartungDetails } from '@/components/details/ReparaturWartungDetails';
import { AusleiheDialog } from '@/components/dialogs/AusleiheDialog';
import { WerkzeugeDialog } from '@/components/dialogs/WerkzeugeDialog';
import { ReparaturWartungDialog } from '@/components/dialogs/ReparaturWartungDialog';
import { HandwerkerDialog } from '@/components/dialogs/HandwerkerDialog';
import type { AusleiheDialogDefaults } from '@/components/dialogs/AusleiheDialog';
import type { WerkzeugeDialogDefaults } from '@/components/dialogs/WerkzeugeDialog';
import type { ReparaturWartungDialogDefaults } from '@/components/dialogs/ReparaturWartungDialog';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { useClock, gruss, namen, undoToast } from '@/lib/polish';
import { tx, appLabel } from '@/i18n';
import {
  IconTool,
  IconAlertTriangle,
  IconUserCheck,
  IconPackage,
  IconPlus,
} from '@tabler/icons-react';
import { format } from 'date-fns';

export type OverlayItem =
  | { type: 'handwerker'; record: Handwerker }
  | { type: 'werkzeuge'; record: Werkzeuge }
  | { type: 'ausleihe'; record: EnrichedAusleihe }
  | { type: 'reparatur_wartung'; record: EnrichedReparaturWartung };

function toneForStatus(status: string | undefined): KanbanTone {
  if (status === 'abgeschlossen') return 'success';
  if (status === 'in_bearbeitung') return 'primary';
  if (status === 'offen') return 'warning';
  return 'default';
}

function toneForZustand(zustand: string | undefined): KanbanTone {
  if (zustand === 'gut') return 'success';
  if (zustand === 'beschaedigt') return 'warning';
  if (zustand === 'ausser_betrieb') return 'destructive';
  return 'default';
}

export default function DashboardOverview() {
  const {
    handwerker, werkzeuge, ausleihe, reparaturWartung,
    setReparaturWartung, setAusleihe,
    handwerkerMap, werkzeugeMap,
    loading, error, fetchAll,
  } = useDashboardData();

  const clock = useClock();

  const enrichedAusleihe = enrichAusleihe(ausleihe, { handwerkerMap, werkzeugeMap });
  const enrichedReparaturWartung = enrichReparaturWartung(reparaturWartung, { werkzeugeMap, handwerkerMap });

  const overlay = useRecordOverlayStack<OverlayItem>();

  // Dialog states
  const [ausleiheOpen, setAusleiheOpen] = useState(false);
  const [ausleiheDefaults, setAusleiheDefaults] = useState<AusleiheDialogDefaults | undefined>(undefined);
  const [werkzeugeOpen, setWerkzeugeOpen] = useState(false);
  const [werkzeugeDefaults, setWerkzeugeDefaults] = useState<WerkzeugeDialogDefaults | undefined>(undefined);
  const [repWartungOpen, setRepWartungOpen] = useState(false);
  const [repWartungDefaults, setRepWartungDefaults] = useState<ReparaturWartungDialogDefaults | undefined>(undefined);
  const [handwerkerOpen, setHandwerkerOpen] = useState(false);

  // Kanban columns for Reparatur/Wartung status
  const kanbanColumns = useMemo<KanbanColumn[]>(
    () => (LOOKUP_OPTIONS['reparatur_wartung']?.['status'] ?? []).map(o => ({ key: o.key, label: o.label })),
    [],
  );

  // Kanban cards
  const kanbanCards = useMemo<KanbanCard[]>(
    () =>
      enrichedReparaturWartung.map(r => {
        const status = lookupKey(r.fields.status) ?? 'offen';
        const werkzeug = werkzeugeMap.get(extractRecordId(r.fields.werkzeug) ?? '');
        return {
          id: `reparatur_wartung:${r.record_id}`,
          column: status,
          title: (werkzeug?.fields.werkzeugname ?? r.werkzeugName) || tx('Unbekanntes Werkzeug'),
          subtitle: r.fields.art?.label
            ? `${r.fields.art.label}${r.fields.startdatum ? ' · ' + formatDate(r.fields.startdatum) : ''}`
            : r.fields.startdatum ? formatDate(r.fields.startdatum) : undefined,
          tone: toneForStatus(status),
        };
      }),
    [enrichedReparaturWartung, werkzeugeMap],
  );

  // Move card = advance status
  const moveCard = useCallback(async (cardId: string, newColumn: string) => {
    const rid = cardId.split(':')[1];
    if (!rid) return;
    const prev = reparaturWartung.find(r => r.record_id === rid);
    if (!prev) return;
    const newStatus = lookupOption('reparatur_wartung', 'status', newColumn);
    setReparaturWartung(cur =>
      cur.map(r => r.record_id === rid ? { ...r, fields: { ...r.fields, status: newStatus } } : r),
    );
    undoToast(
      tx`${prev.fields.beschreibung ?? tx('Eintrag')} — ${newStatus.label}`,
      async () => {
        setReparaturWartung(cur =>
          cur.map(r => r.record_id === rid ? { ...r, fields: { ...r.fields, status: prev.fields.status } } : r),
        );
        await LivingAppsService.updateReparaturWartungEntry(rid, { status: lookupKey(prev.fields.status) }).catch(() => fetchAll());
      },
    );
    try {
      await LivingAppsService.updateReparaturWartungEntry(rid, { status: newColumn });
    } catch {
      fetchAll();
    }
  }, [reparaturWartung, setReparaturWartung, fetchAll]);

  // Derived KPIs
  const today = format(clock, 'yyyy-MM-dd');
  const werkzeugeDefect = useMemo(
    () => werkzeuge.filter(w => lookupKey(w.fields.zustand) !== 'gut'),
    [werkzeuge],
  );
  const ausleiheAktiv = useMemo(
    () => enrichedAusleihe.filter(a => lookupKey(a.fields.status) === 'ausgeliehen'),
    [enrichedAusleihe],
  );
  const ausleiheUeberfaellig = useMemo(
    () => ausleiheAktiv.filter(a => a.fields.geplantes_rueckgabedatum && a.fields.geplantes_rueckgabedatum < today),
    [ausleiheAktiv, today],
  );
  const repWartungOffen = useMemo(
    () => enrichedReparaturWartung.filter(r => lookupKey(r.fields.status) === 'offen'),
    [enrichedReparaturWartung],
  );
  const handwerkerAktiv = useMemo(
    () => handwerker.filter(h => lookupKey(h.fields.status) === 'aktiv'),
    [handwerker],
  );

  // Return item handler for ausleihe
  const handleReturn = useCallback(async (a: EnrichedAusleihe) => {
    const prevStatus = a.fields.status;
    const newStatus = lookupOption('ausleihe', 'status', 'zurueckgegeben');
    setAusleihe(cur =>
      cur.map(r => r.record_id === a.record_id ? { ...r, fields: { ...r.fields, status: newStatus, tatsaechliches_rueckgabedatum: today } } : r),
    );
    undoToast(
      tx`${a.werkzeugName || tx('Werkzeug')} — ${tx('zurückgegeben')}`,
      async () => {
        setAusleihe(cur =>
          cur.map(r => r.record_id === a.record_id ? { ...r, fields: { ...r.fields, status: prevStatus, tatsaechliches_rueckgabedatum: undefined } } : r),
        );
        await LivingAppsService.updateAusleiheEntry(a.record_id, { status: lookupKey(prevStatus), tatsaechliches_rueckgabedatum: undefined }).catch(() => fetchAll());
      },
    );
    try {
      await LivingAppsService.updateAusleiheEntry(a.record_id, { status: 'zurueckgegeben', tatsaechliches_rueckgabedatum: today });
    } catch {
      fetchAll();
    }
  }, [today, setAusleihe, fetchAll]);

  // ─── Hooks above, early returns below ───
  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  // Context line
  const hasWerkzeuge = werkzeuge.length > 0;
  const contextLine = (() => {
    if (!hasWerkzeuge) return tx('Noch keine Werkzeuge im System.');
    const parts: string[] = [];
    if (ausleiheUeberfaellig.length > 0) {
      parts.push(`${namen(ausleiheUeberfaellig.map(a => a.werkzeugName || ''))} ${ausleiheUeberfaellig.length === 1 ? tx('ist überfällig') : tx('sind überfällig')}`);
    }
    if (repWartungOffen.length > 0) {
      parts.push(`${repWartungOffen.length} ${repWartungOffen.length === 1 ? tx('offene Maßnahme') : tx('offene Maßnahmen')}`);
    }
    if (parts.length === 0) return tx('Alles im grünen Bereich — keine Überfälligkeiten.');
    return parts.join(' · ');
  })();

  return (
    <>
      {/* Page header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{gruss(clock)}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{contextLine}</p>
        </div>
        <button
          onClick={() => { setRepWartungDefaults(undefined); setRepWartungOpen(true); }}
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <IconPlus size={16} className="shrink-0" />
          <span className="hidden sm:inline">{tx('Maßnahme erfassen')}</span>
        </button>
      </div>

      <DashboardGrid
        variant="wide"
        hero={
          ausleiheUeberfaellig.length > 0 ? (
            <HeroBanner
              icon={<IconAlertTriangle size={18} />}
              action={{
                label: tx('Rückgabe eintragen'),
                onClick: () => handleReturn(ausleiheUeberfaellig[0]),
              }}
            >
              <b>{namen(ausleiheUeberfaellig.map(a => a.werkzeugName || ''))}</b>{' '}
              {ausleiheUeberfaellig.length === 1
                ? tx`— Rückgabe war fällig am ${formatDate(ausleiheUeberfaellig[0].fields.geplantes_rueckgabedatum)}.`
                : tx`— Rückgaben überfällig.`}
            </HeroBanner>
          ) : undefined
        }
        kpis={
          <StatStrip>
            <StatStripItem
              title={appLabel('werkzeuge')}
              value={werkzeuge.length}
              icon={<IconTool size={16} className="shrink-0" />}
              tone="default"
              onClick={() => overlay.close()}
            />
            <StatStripItem
              title={tx('Defekt / Außer Betrieb')}
              value={werkzeugeDefect.length}
              icon={<IconTool size={16} className="shrink-0" />}
              tone={werkzeugeDefect.length > 0 ? 'destructive' : 'default'}
            />
            <StatStripItem
              title={tx('Ausgeliehen')}
              value={ausleiheAktiv.length}
              icon={<IconPackage size={16} className="shrink-0" />}
              tone={ausleiheUeberfaellig.length > 0 ? 'warning' : 'default'}
            />
            <StatStripItem
              title={tx('Aktive Handwerker')}
              value={handwerkerAktiv.length}
              icon={<IconUserCheck size={16} className="shrink-0" />}
              tone="default"
            />
          </StatStrip>
        }
        primary={
          <KanbanWidget
            cards={kanbanCards}
            columns={kanbanColumns}
            defaultCollapsed={['abgeschlossen']}
            onCardClick={card => {
              const rid = card.id.split(':')[1];
              const r = enrichedReparaturWartung.find(x => x.record_id === rid);
              if (r) overlay.replace({ type: 'reparatur_wartung', record: r });
            }}
            onCardMove={moveCard}
            onAddCard={column => {
              setRepWartungDefaults({ status: column });
              setRepWartungOpen(true);
            }}
          />
        }
        aside={
          <>
            <WorkList
              title={tx('Aktive Ausleihen')}
              items={ausleiheAktiv.slice(0, 8).map(a => ({
                id: a.record_id,
                title: a.werkzeugName || tx('Werkzeug'),
                secondLine: (
                  <>
                    <span className={`font-medium ${ausleiheUeberfaellig.some(x => x.record_id === a.record_id) ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {a.handwerkerName || '—'}
                    </span>
                    {a.fields.geplantes_rueckgabedatum && (
                      <span className="text-muted-foreground"> · {tx('bis')} {formatDate(a.fields.geplantes_rueckgabedatum)}</span>
                    )}
                  </>
                ),
                action: {
                  label: tx('Zurückgeben'),
                  onClick: () => handleReturn(a),
                },
              }))}
              onItemClick={id => {
                const a = enrichedAusleihe.find(x => x.record_id === id);
                if (a) overlay.replace({ type: 'ausleihe', record: a });
              }}
              empty={{
                text: tx('Keine aktiven Ausleihen — alle Werkzeuge verfügbar.'),
                action: { label: tx('Ausleihe erfassen'), onClick: () => { setAusleiheDefaults(undefined); setAusleiheOpen(true); } },
              }}
            />
            <WorkList
              title={tx('Werkzeuge — Zustand')}
              items={werkzeuge.slice(0, 8).map(w => ({
                id: w.record_id,
                title: w.fields.werkzeugname ?? tx('Unbekannt'),
                secondLine: (
                  <>
                    <span
                      className={`font-medium ${
                        lookupKey(w.fields.zustand) === 'gut'
                          ? 'text-success'
                          : lookupKey(w.fields.zustand) === 'beschaedigt'
                          ? 'text-warning'
                          : 'text-destructive'
                      }`}
                    >
                      {w.fields.zustand?.label ?? '—'}
                    </span>
                    {w.fields.kategorie && (
                      <span className="text-muted-foreground"> · {w.fields.kategorie.label}</span>
                    )}
                  </>
                ),
              }))}
              onItemClick={id => {
                const w = werkzeuge.find(x => x.record_id === id);
                if (w) overlay.replace({ type: 'werkzeuge', record: w });
              }}
              empty={{
                text: tx('Noch keine Werkzeuge — erstes Werkzeug anlegen.'),
                action: { label: tx('Werkzeug anlegen'), onClick: () => { setWerkzeugeDefaults(undefined); setWerkzeugeOpen(true); } },
              }}
            />
          </>
        }
      />

      {/* Overlay stack — one host, one shell */}
      <RecordOverlayHost
        overlay={overlay}
        render={top => {
          if (top.type === 'reparatur_wartung') {
            const r = top.record as EnrichedReparaturWartung;
            return (
              <>
                <RecordHeader
                  title={r.werkzeugName || tx('Unbekanntes Werkzeug')}
                  subtitle={r.fields.art?.label}
                  badges={
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      lookupKey(r.fields.status) === 'abgeschlossen' ? 'bg-success/10 text-success' :
                      lookupKey(r.fields.status) === 'in_bearbeitung' ? 'bg-primary/10 text-primary' :
                      'bg-warning/10 text-warning'
                    }`}>
                      {r.fields.status?.label ?? '—'}
                    </span>
                  }
                />
                <ReparaturWartungDetails
                  record={r}
                  werkzeugeList={werkzeuge}
                  handwerkerList={handwerker}
                  onOpenWerkzeuge={w => overlay.push({ type: 'werkzeuge', record: w })}
                  onOpenHandwerker={h => overlay.push({ type: 'handwerker', record: h })}
                />
              </>
            );
          }
          if (top.type === 'werkzeuge') {
            const w = top.record as Werkzeuge;
            return (
              <>
                <RecordHeader
                  title={w.fields.werkzeugname ?? tx('Werkzeug')}
                  subtitle={w.fields.kategorie?.label}
                  badges={
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      lookupKey(w.fields.zustand) === 'gut' ? 'bg-success/10 text-success' :
                      lookupKey(w.fields.zustand) === 'beschaedigt' ? 'bg-warning/10 text-warning' :
                      'bg-destructive/10 text-destructive'
                    }`}>
                      {w.fields.zustand?.label ?? '—'}
                    </span>
                  }
                />
                <WerkzeugeDetails
                  record={w}
                  ausleiheList={ausleihe}
                  reparaturWartungList={reparaturWartung}
                  onOpenAusleihe={a => {
                    const enriched = enrichedAusleihe.find(x => x.record_id === a.record_id);
                    if (enriched) overlay.push({ type: 'ausleihe', record: enriched });
                  }}
                  onAddAusleihe={() => {
                    setAusleiheDefaults({ werkzeug: w.record_id });
                    setAusleiheOpen(true);
                  }}
                  onOpenReparaturWartung={r => {
                    const enriched = enrichedReparaturWartung.find(x => x.record_id === r.record_id);
                    if (enriched) overlay.push({ type: 'reparatur_wartung', record: enriched });
                  }}
                  onAddReparaturWartung={() => {
                    setRepWartungDefaults({ werkzeug: w.record_id });
                    setRepWartungOpen(true);
                  }}
                />
              </>
            );
          }
          if (top.type === 'ausleihe') {
            const a = top.record as EnrichedAusleihe;
            return (
              <>
                <RecordHeader
                  title={a.werkzeugName || tx('Werkzeug')}
                  subtitle={a.handwerkerName}
                  badges={
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      lookupKey(a.fields.status) === 'zurueckgegeben' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                    }`}>
                      {a.fields.status?.label ?? '—'}
                    </span>
                  }
                />
                <AusleiheDetails
                  record={a}
                  handwerkerList={handwerker}
                  werkzeugeList={werkzeuge}
                  onOpenHandwerker={h => overlay.push({ type: 'handwerker', record: h })}
                  onOpenWerkzeuge={w => overlay.push({ type: 'werkzeuge', record: w })}
                />
              </>
            );
          }
          if (top.type === 'handwerker') {
            const h = top.record as Handwerker;
            return (
              <>
                <RecordHeader
                  title={`${h.fields.vorname ?? ''} ${h.fields.nachname ?? ''}`.trim() || tx('Handwerker')}
                  subtitle={h.fields.abteilung}
                  badges={
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      lookupKey(h.fields.status) === 'aktiv' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
                    }`}>
                      {h.fields.status?.label ?? '—'}
                    </span>
                  }
                />
                <HandwerkerDetails
                  record={h}
                  ausleiheList={ausleihe}
                  reparaturWartungList={reparaturWartung}
                  onOpenAusleihe={a => {
                    const enriched = enrichedAusleihe.find(x => x.record_id === a.record_id);
                    if (enriched) overlay.push({ type: 'ausleihe', record: enriched });
                  }}
                  onAddAusleihe={() => {
                    setAusleiheDefaults({ handwerker: h.record_id });
                    setAusleiheOpen(true);
                  }}
                  onOpenReparaturWartung={r => {
                    const enriched = enrichedReparaturWartung.find(x => x.record_id === r.record_id);
                    if (enriched) overlay.push({ type: 'reparatur_wartung', record: enriched });
                  }}
                  onAddReparaturWartung={() => {
                    setRepWartungDefaults({ verantwortlicher_handwerker: h.record_id });
                    setRepWartungOpen(true);
                  }}
                />
              </>
            );
          }
          return null;
        }}
        footer={top => {
          if (top.type === 'reparatur_wartung') {
            const r = top.record as EnrichedReparaturWartung;
            const status = lookupKey(r.fields.status);
            if (status === 'offen') return { label: tx('In Bearbeitung setzen'), onClick: () => moveCard(`reparatur_wartung:${r.record_id}`, 'in_bearbeitung') };
            if (status === 'in_bearbeitung') return { label: tx('Abschließen'), onClick: () => moveCard(`reparatur_wartung:${r.record_id}`, 'abgeschlossen') };
          }
          if (top.type === 'ausleihe') {
            const a = top.record as EnrichedAusleihe;
            if (lookupKey(a.fields.status) === 'ausgeliehen') return { label: tx('Rückgabe eintragen'), onClick: () => { overlay.close(); handleReturn(a); } };
          }
          return undefined;
        }}
      />

      {/* Dialogs */}
      <AusleiheDialog
        open={ausleiheOpen}
        onClose={() => setAusleiheOpen(false)}
        onSubmit={async fields => { await LivingAppsService.createAusleiheEntry(fields); fetchAll(); }}
        defaultValues={ausleiheDefaults}
        handwerkerList={handwerker}
        werkzeugeList={werkzeuge}
        enablePhotoScan={AI_PHOTO_SCAN['Ausleihe']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Ausleihe']}
      />
      <WerkzeugeDialog
        open={werkzeugeOpen}
        onClose={() => setWerkzeugeOpen(false)}
        onSubmit={async fields => { await LivingAppsService.createWerkzeugeEntry(fields); fetchAll(); }}
        defaultValues={werkzeugeDefaults}
        enablePhotoScan={AI_PHOTO_SCAN['Werkzeuge']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Werkzeuge']}
      />
      <ReparaturWartungDialog
        open={repWartungOpen}
        onClose={() => setRepWartungOpen(false)}
        onSubmit={async fields => { await LivingAppsService.createReparaturWartungEntry(fields); fetchAll(); }}
        defaultValues={repWartungDefaults}
        werkzeugeList={werkzeuge}
        handwerkerList={handwerker}
        enablePhotoScan={AI_PHOTO_SCAN['ReparaturWartung']}
        enablePhotoLocation={AI_PHOTO_LOCATION['ReparaturWartung']}
      />
      <HandwerkerDialog
        open={handwerkerOpen}
        onClose={() => setHandwerkerOpen(false)}
        onSubmit={async fields => { await LivingAppsService.createHandwerkerEntry(fields); fetchAll(); }}
        enablePhotoScan={AI_PHOTO_SCAN['Handwerker']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Handwerker']}
      />
    </>
  );
}
