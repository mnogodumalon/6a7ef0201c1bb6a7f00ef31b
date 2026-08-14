/**
 * Werkzeug zurückgeben — 2-Schritt-Wizard.
 * Steps: 1) Ausleihe wählen (nur Status 'ausgeliehen') → 2) Rückgabe bestätigen & abschließen.
 * Reads: ausleihe, handwerker, werkzeuge. Writes: ausleihe (updateAusleiheEntry), werkzeuge (updateWerkzeugeEntry).
 * Composes: IntentWizardShell, EntitySelectStep.
 */

import { useState } from 'react';
import { format } from 'date-fns';
import { IconArrowBack, IconCircleCheck, IconTool } from '@tabler/icons-react';
import { IntentWizardShell } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { StatusBadge } from '@/components/blocks/StatusBadge';
import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichAusleihe } from '@/lib/enrich';
import type { EnrichedAusleihe } from '@/types/enriched';
import { LivingAppsService, extractRecordId } from '@/services/livingAppsService';
import { LOOKUP_OPTIONS } from '@/types/app';
import { formatDate } from '@/lib/formatters';
import { tx } from '@/i18n';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

export default function WerkzeugZurueckgebenPage() {
  const WIZARD_STEPS = [
  { label: tx('Ausleihe wählen') },
  { label: tx('Rückgabe bestätigen') },
];

  const { ausleihe, handwerkerMap, werkzeugeMap, loading, error, fetchAll } = useDashboardData();

  const [step, setStep] = useState(1);
  const [selectedAusleihe, setSelectedAusleihe] = useState<EnrichedAusleihe | null>(null);
  const [rueckgabedatum, setRueckgabedatum] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [neuerZustandKey, setNeuerZustandKey] = useState('none');
  const [bemerkungen, setBemerkungen] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const enrichedAusleihe = enrichAusleihe(ausleihe, { handwerkerMap, werkzeugeMap });
  const offeneAusleihen = enrichedAusleihe.filter(a => a.fields.status?.key === 'ausgeliehen');

  const zustandOptionen = LOOKUP_OPTIONS['werkzeuge']?.['zustand'] ?? [];

  const handleSelectAusleihe = (id: string) => {
    const found = offeneAusleihen.find(a => a.record_id === id);
    if (found) {
      setSelectedAusleihe(found);
      setStep(2);
    }
  };

  const handleBestaetigen = async () => {
    if (!selectedAusleihe) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await LivingAppsService.updateAusleiheEntry(selectedAusleihe.record_id, {
        status: 'zurueckgegeben',
        tatsaechliches_rueckgabedatum: rueckgabedatum,
        ...(bemerkungen.trim() ? { bemerkungen: bemerkungen.trim() } : {}),
      });

      if (neuerZustandKey !== 'none') {
        const werkzeugId = extractRecordId(selectedAusleihe.fields.werkzeug);
        if (werkzeugId) {
          await LivingAppsService.updateWerkzeugeEntry(werkzeugId, {
            zustand: neuerZustandKey,
          });
        }
      }

      await fetchAll();
      setDone(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : tx('Fehler beim Speichern'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setSelectedAusleihe(null);
    setRueckgabedatum(format(new Date(), 'yyyy-MM-dd'));
    setNeuerZustandKey('none');
    setBemerkungen('');
    setSubmitError(null);
    setDone(false);
    setStep(1);
  };

  if (done) {
    return (
      <IntentWizardShell
        title={tx('Werkzeug zurückgeben')}
        subtitle={tx('Ausleihe abschließen')}
        steps={WIZARD_STEPS}
        currentStep={2}
        onStepChange={setStep}
        loading={false}
        error={null}
        onRetry={fetchAll}
      >
        <div className="flex flex-col items-center justify-center py-16 space-y-6 text-center">
          <div className="rounded-full bg-green-100 p-4">
            <IconCircleCheck size={48} className="text-green-600" stroke={1.5} />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">
              {tx('Rückgabe erfolgreich abgeschlossen')}
            </h2>
            <p className="text-sm text-muted-foreground">
              {tx('Das Werkzeug wurde als zurückgegeben markiert.')}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button onClick={handleReset} variant="default">
              {tx('Weitere Rückgabe erfassen')}
            </Button>
            <a href="#/">
              <Button variant="outline" className="w-full sm:w-auto">
                <IconArrowBack size={16} className="mr-2 shrink-0" />
                {tx('Zurück zum Dashboard')}
              </Button>
            </a>
          </div>
        </div>
      </IntentWizardShell>
    );
  }

  return (
    <IntentWizardShell
      title={tx('Werkzeug zurückgeben')}
      subtitle={tx('Ausleihe abschließen')}
      steps={WIZARD_STEPS}
      currentStep={step}
      onStepChange={setStep}
      loading={loading}
      error={error}
      onRetry={fetchAll}
    >
      {step === 1 && (
        <EntitySelectStep
          items={offeneAusleihen.map(a => ({
            id: a.record_id,
            title: a.werkzeugName || tx('Unbekanntes Werkzeug'),
            subtitle: [
              a.handwerkerName ? `${tx('Ausgeliehen von')}: ${a.handwerkerName}` : null,
              a.fields.ausleihdatum ? `${tx('Seit')}: ${formatDate(a.fields.ausleihdatum)}` : null,
              a.fields.geplantes_rueckgabedatum ? `${tx('Geplante Rückgabe')}: ${formatDate(a.fields.geplantes_rueckgabedatum)}` : null,
            ].filter(Boolean).join(' · '),
            status: a.fields.status
              ? { key: a.fields.status.key, label: a.fields.status.label }
              : undefined,
            icon: <IconTool size={20} className="text-primary" />,
          }))}
          onSelect={handleSelectAusleihe}
          searchPlaceholder={tx('Werkzeug oder Handwerker suchen …')}
          emptyText={tx('Keine offenen Ausleihen gefunden.')}
          emptyIcon={<IconTool size={32} className="text-muted-foreground" />}
        />
      )}

      {step === 2 && (
        selectedAusleihe ? (
          <div className="space-y-6 max-w-lg mx-auto">
            {/* Zusammenfassung der gewählten Ausleihe */}
            <div className="rounded-2xl border bg-card p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{tx('Werkzeug')}</p>
                  <p className="font-semibold text-foreground">
                    {selectedAusleihe.werkzeugName || tx('Unbekanntes Werkzeug')}
                  </p>
                </div>
                <StatusBadge
                  statusKey={selectedAusleihe.fields.status?.key}
                  label={selectedAusleihe.fields.status?.label}
                />
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">{tx('Handwerker')}</p>
                  <p className="font-medium text-foreground">{selectedAusleihe.handwerkerName || '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{tx('Ausgeliehen seit')}</p>
                  <p className="font-medium text-foreground">
                    {selectedAusleihe.fields.ausleihdatum
                      ? formatDate(selectedAusleihe.fields.ausleihdatum)
                      : '—'}
                  </p>
                </div>
                {selectedAusleihe.fields.geplantes_rueckgabedatum && (
                  <div>
                    <p className="text-muted-foreground">{tx('Geplante Rückgabe')}</p>
                    <p className="font-medium text-foreground">
                      {formatDate(selectedAusleihe.fields.geplantes_rueckgabedatum)}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Rückgabe-Formular */}
            <div className="rounded-2xl border bg-card p-5 space-y-4">
              <h3 className="font-semibold text-foreground">{tx('Rückgabedetails')}</h3>

              <div className="space-y-2">
                <Label htmlFor="rueckgabedatum">{tx('Tatsächliches Rückgabedatum')}</Label>
                <Input
                  id="rueckgabedatum"
                  type="date"
                  value={rueckgabedatum}
                  onChange={e => setRueckgabedatum(e.target.value)}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="werkzeug-zustand">{tx('Zustand des Werkzeugs')}</Label>
                <Select value={neuerZustandKey} onValueChange={setNeuerZustandKey}>
                  <SelectTrigger id="werkzeug-zustand" className="w-full">
                    <SelectValue placeholder={tx('Zustand wählen (optional)')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{tx('Nicht ändern')}</SelectItem>
                    {zustandOptionen.map(opt => (
                      <SelectItem key={opt.key} value={opt.key}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {tx('Aktualisiert den Zustand des Werkzeugs nach der Rückgabe.')}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bemerkungen">{tx('Bemerkungen')}</Label>
                <Textarea
                  id="bemerkungen"
                  value={bemerkungen}
                  onChange={e => setBemerkungen(e.target.value)}
                  placeholder={tx('Optionale Anmerkungen zur Rückgabe …')}
                  rows={3}
                  className="resize-none"
                />
              </div>
            </div>

            {submitError && (
              <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                {submitError}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                disabled={submitting}
                className="sm:w-auto"
              >
                {tx('Zurück')}
              </Button>
              <Button
                onClick={handleBestaetigen}
                disabled={submitting || !rueckgabedatum}
                className="flex-1"
              >
                {submitting ? tx('Wird gespeichert …') : tx('Rückgabe abschließen')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 space-y-3 text-center">
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
