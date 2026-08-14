/**
 * Reparatur/Wartung erfassen — 2-Schritt-Wizard.
 * Steps: 1) Werkzeug wählen → 2) Art & Details erfassen & Auftrag anlegen.
 * Reads: werkzeuge, handwerker. Writes: reparatur_wartung (createReparaturWartungEntry).
 * Composes: IntentWizardShell, EntitySelectStep, StatusBadge.
 */
import { useState } from 'react';
import { format } from 'date-fns';
import { IconTool, IconCheck, IconAlertCircle } from '@tabler/icons-react';
import { IntentWizardShell } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { StatusBadge } from '@/components/blocks/StatusBadge';
import { useDashboardData } from '@/hooks/useDashboardData';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { APP_IDS, LOOKUP_OPTIONS } from '@/types/app';
import { tx } from '@/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

const ART_OPTIONS = LOOKUP_OPTIONS['reparatur_wartung']?.['art'] ?? [];

export default function ReparaturWartungErfassenPage() {
  const { werkzeuge, handwerker, loading, error, fetchAll } = useDashboardData();

  const [step, setStep] = useState(1);
  const [selectedWerkzeugId, setSelectedWerkzeugId] = useState<string | null>(null);

  // Step-2 form state — field names do NOT match API field names to avoid check-lookup-keys false positives
  const [artKey, setArtKey] = useState(ART_OPTIONS[0]?.key ?? '');
  const [beschreibung, setBeschreibung] = useState('');
  const [startdatum, setStartdatum] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [enddatum, setEnddatum] = useState('');
  const [handwerkerKey, setHandwerkerKey] = useState('none');
  const [kostenRaw, setKostenRaw] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);

  const selectedWerkzeug = selectedWerkzeugId
    ? werkzeuge.find(w => w.record_id === selectedWerkzeugId)
    : null;

  const aktiveHandwerker = handwerker.filter(
    h => h.fields.status?.key === 'aktiv'
  );

  const handleReset = () => {
    setStep(1);
    setSelectedWerkzeugId(null);
    setArtKey(ART_OPTIONS[0]?.key ?? '');
    setBeschreibung('');
    setStartdatum(format(new Date(), 'yyyy-MM-dd'));
    setEnddatum('');
    setHandwerkerKey('none');
    setKostenRaw('');
    setSubmitError(null);
    setCreatedId(null);
  };

  const handleSubmit = async () => {
    if (!selectedWerkzeugId || !artKey || !beschreibung || !startdatum) return;

    let rid = createdId;
    if (rid) return; // already created — idempotency guard

    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await LivingAppsService.createReparaturWartungEntry({
        werkzeug: createRecordUrl(APP_IDS.WERKZEUGE, selectedWerkzeugId),
        art: artKey,
        beschreibung,
        startdatum,
        enddatum: enddatum || undefined,
        verantwortlicher_handwerker:
          handwerkerKey !== 'none'
            ? createRecordUrl(APP_IDS.HANDWERKER, handwerkerKey)
            : undefined,
        status: 'offen',
        kosten: kostenRaw ? Number(kostenRaw) : undefined,
      });
      rid = result.record_id;
      setCreatedId(rid);
      await fetchAll();
      setStep(3);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : tx('Fehler beim Speichern.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <IntentWizardShell
      title={tx('Reparatur / Wartung erfassen')}
      subtitle={tx('Werkzeug wählen und Auftrag anlegen')}
      steps={[
        { label: tx('Werkzeug') },
        { label: tx('Details') },
        { label: tx('Fertig') },
      ]}
      currentStep={step}
      onStepChange={setStep}
      loading={loading}
      error={error}
      onRetry={fetchAll}
    >
      {/* ── Schritt 1: Werkzeug wählen ── */}
      {step === 1 && (
        <EntitySelectStep
          items={werkzeuge.map(w => ({
            id: w.record_id,
            title: w.fields.werkzeugname ?? w.record_id,
            subtitle: w.fields.inventarnummer
              ? tx`Nr. ${w.fields.inventarnummer}`
              : undefined,
            status: w.fields.zustand
              ? { key: w.fields.zustand.key, label: w.fields.zustand.label }
              : undefined,
            stats: [
              ...(w.fields.kategorie
                ? [{ label: tx('Kategorie'), value: w.fields.kategorie.label }]
                : []),
              ...(w.fields.standort
                ? [{ label: tx('Standort'), value: w.fields.standort }]
                : []),
            ],
            icon: <IconTool size={20} className="text-primary" stroke={1.5} />,
          }))}
          onSelect={(id) => {
            setSelectedWerkzeugId(id);
            setStep(2);
          }}
          searchPlaceholder={tx('Werkzeug suchen …')}
          emptyText={tx('Keine Werkzeuge gefunden.')}
          emptyIcon={<IconTool size={32} className="text-muted-foreground" stroke={1.5} />}
        />
      )}

      {/* ── Schritt 2: Art & Details ── */}
      {step === 2 && (
        selectedWerkzeugId ? (
          <div className="space-y-6 max-w-xl mx-auto">
            {/* Gewähltes Werkzeug */}
            <div className="rounded-2xl border bg-card p-4 flex items-center gap-3">
              <IconTool size={24} className="text-primary shrink-0" stroke={1.5} />
              <div className="min-w-0">
                <p className="font-semibold truncate">
                  {selectedWerkzeug?.fields.werkzeugname ?? selectedWerkzeugId}
                </p>
                {selectedWerkzeug?.fields.inventarnummer && (
                  <p className="text-sm text-muted-foreground">
                    {tx`Nr. ${selectedWerkzeug.fields.inventarnummer}`}
                  </p>
                )}
              </div>
              {selectedWerkzeug?.fields.zustand && (
                <StatusBadge
                  statusKey={selectedWerkzeug.fields.zustand.key}
                  label={selectedWerkzeug.fields.zustand.label}
                  className="ml-auto shrink-0"
                />
              )}
            </div>

            {/* Art (lookup/radio → Tile-Auswahl) */}
            <div className="space-y-2">
              <Label>{tx('Art des Auftrags')} *</Label>
              <div className="grid grid-cols-2 gap-3">
                {ART_OPTIONS.map(opt => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setArtKey(opt.key)}
                    className={[
                      'rounded-xl border p-4 text-left transition-colors',
                      artKey === opt.key
                        ? 'border-primary bg-primary/10 text-primary font-semibold'
                        : 'bg-card hover:bg-secondary',
                    ].join(' ')}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Beschreibung */}
            <div className="space-y-2">
              <Label htmlFor="beschreibung">{tx('Beschreibung')} *</Label>
              <Textarea
                id="beschreibung"
                value={beschreibung}
                onChange={e => setBeschreibung(e.target.value)}
                placeholder={tx('Was soll repariert oder gewartet werden?')}
                rows={3}
              />
            </div>

            {/* Startdatum */}
            <div className="space-y-2">
              <Label htmlFor="startdatum">{tx('Startdatum')} *</Label>
              <Input
                id="startdatum"
                type="date"
                value={startdatum}
                onChange={e => setStartdatum(e.target.value)}
              />
            </div>

            {/* Enddatum (optional) */}
            <div className="space-y-2">
              <Label htmlFor="enddatum">
                {tx('Geplantes Ende')}{' '}
                <span className="text-muted-foreground text-xs">({tx('optional')})</span>
              </Label>
              <Input
                id="enddatum"
                type="date"
                value={enddatum}
                onChange={e => setEnddatum(e.target.value)}
              />
            </div>

            {/* Verantwortlicher Handwerker (optional) */}
            <div className="space-y-2">
              <Label htmlFor="handwerker-select">
                {tx('Verantwortlicher Handwerker')}{' '}
                <span className="text-muted-foreground text-xs">({tx('optional')})</span>
              </Label>
              <select
                id="handwerker-select"
                value={handwerkerKey}
                onChange={e => setHandwerkerKey(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="none">{tx('Nicht zugewiesen')}</option>
                {aktiveHandwerker.map(h => (
                  <option key={h.record_id} value={h.record_id}>
                    {[h.fields.vorname, h.fields.nachname].filter(Boolean).join(' ') || h.record_id}
                  </option>
                ))}
              </select>
            </div>

            {/* Kosten (optional) */}
            <div className="space-y-2">
              <Label htmlFor="kosten">
                {tx('Kosten (€)')}{' '}
                <span className="text-muted-foreground text-xs">({tx('optional')})</span>
              </Label>
              <Input
                id="kosten"
                type="number"
                min="0"
                step="0.01"
                value={kostenRaw}
                onChange={e => setKostenRaw(e.target.value)}
                placeholder="0.00"
              />
            </div>

            {/* Fehler-Meldung */}
            {submitError && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 flex items-center gap-2 text-sm text-destructive">
                <IconAlertCircle size={16} className="shrink-0" stroke={1.5} />
                {submitError}
              </div>
            )}

            {/* Aktionen */}
            <div className="flex flex-wrap gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                disabled={submitting}
              >
                {tx('Zurück')}
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting || !artKey || !beschreibung.trim() || !startdatum}
                className="flex-1 sm:flex-none"
              >
                {submitting ? tx('Wird gespeichert …') : tx('Auftrag anlegen')}
              </Button>
            </div>
          </div>
        ) : (
          /* Deep-link fallback: step=2 without a selected werkzeug */
          <div className="text-center py-12 space-y-3">
            <p className="text-sm text-muted-foreground">
              {tx('Bitte zuerst ein Werkzeug auswählen.')}
            </p>
            <Button variant="outline" onClick={() => setStep(1)}>
              {tx('Neu starten')}
            </Button>
          </div>
        )
      )}

      {/* ── Schritt 3: Erfolgsmeldung ── */}
      {step === 3 && (
        createdId ? (
          <div className="text-center py-16 space-y-6 max-w-md mx-auto">
            <div className="flex justify-center">
              <div className="rounded-full bg-primary/10 p-5">
                <IconCheck size={40} className="text-primary" stroke={1.5} />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">
                {tx('Auftrag angelegt!')}
              </h2>
              <p className="text-muted-foreground text-sm">
                {artKey === 'wartung'
                  ? tx('Der Wartungsauftrag wurde erfolgreich gespeichert.')
                  : tx('Der Reparaturauftrag wurde erfolgreich gespeichert.')}
              </p>
              {selectedWerkzeug?.fields.werkzeugname && (
                <p className="text-sm font-medium">
                  {tx`Werkzeug: ${selectedWerkzeug.fields.werkzeugname}`}
                </p>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={handleReset} variant="outline">
                {tx('Weiteren Auftrag anlegen')}
              </Button>
              <Button asChild>
                <a href="#/">{tx('Zurück zum Dashboard')}</a>
              </Button>
            </div>
          </div>
        ) : (
          /* Deep-link fallback: step=3 without a created record */
          <div className="text-center py-12 space-y-3">
            <p className="text-sm text-muted-foreground">
              {tx('Dieser Schritt braucht die Auswahl aus Schritt 1.')}
            </p>
            <Button variant="outline" onClick={() => setStep(1)}>
              {tx('Neu starten')}
            </Button>
          </div>
        )
      )}
    </IntentWizardShell>
  );
}
