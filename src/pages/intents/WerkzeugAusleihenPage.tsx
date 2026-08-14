/**
 * Werkzeug Ausleihen — 3-Schritt-Wizard.
 * Steps: 1) Handwerker wählen → 2) Werkzeug wählen → 3) Ausleihe bestätigen & anlegen.
 * Reads: handwerker, werkzeuge, ausleihe. Writes: ausleihe (createAusleiheEntry).
 * Composes: IntentWizardShell, EntitySelectStep, StatusBadge.
 */

import { useState } from 'react';
import { format } from 'date-fns';
import { IconTool, IconUser, IconCheck, IconCalendar } from '@tabler/icons-react';
import { IntentWizardShell } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { StatusBadge } from '@/components/blocks/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useDashboardData } from '@/hooks/useDashboardData';
import { LivingAppsService, createRecordUrl, extractRecordId } from '@/services/livingAppsService';
import { APP_IDS } from '@/types/app';
import type { Handwerker, Werkzeuge } from '@/types/app';
import { tx } from '@/i18n';

export default function WerkzeugAusleihenPage() {
  const { handwerker, werkzeuge, ausleihe, loading, error, fetchAll } = useDashboardData();

  const [step, setStep] = useState(1);
  const [selectedHandwerkerId, setSelectedHandwerkerId] = useState<string | null>(null);
  const [selectedWerkzeugId, setSelectedWerkzeugId] = useState<string | null>(null);

  const [ausleihdatum, setAusleihdatum] = useState(
    format(new Date(), "yyyy-MM-dd'T'HH:mm")
  );
  const [geplantesRueckgabedatum, setGeplantesRueckgabedatum] = useState('');
  const [bemerkungen, setBemerkungen] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Filter: nur aktive Handwerker
  const aktiveHandwerker: Handwerker[] = handwerker.filter(
    (h) => h.fields.status?.key === 'aktiv'
  );

  // Bestimme welche Werkzeuge bereits ausgeliehen sind (aktive Ausleihe)
  const ausgeliehenWerkzeugUrls = new Set<string>(
    ausleihe
      .filter((a) => a.fields.status?.key === 'ausgeliehen' && a.fields.werkzeug)
      .map((a) => a.fields.werkzeug as string)
  );

  // Hilfsfunktion: extrahiere Record-ID aus URL, um mit APP_IDS zu vergleichen
  const ausgeliehenWerkzeugIds = new Set<string>(
    Array.from(ausgeliehenWerkzeugUrls)
      .map((url) => {
        const parts = url.split('/');
        return parts[parts.length - 1];
      })
      .filter(Boolean)
  );

  // Filter: nur Werkzeuge mit Zustand 'gut' UND nicht aktiv ausgeliehen
  const verfuegbareWerkzeuge: Werkzeuge[] = werkzeuge.filter(
    (w) =>
      w.fields.zustand?.key === 'gut' &&
      !ausgeliehenWerkzeugIds.has(w.record_id)
  );

  const selectedHandwerker = handwerker.find((h) => h.record_id === selectedHandwerkerId);
  const selectedWerkzeug = werkzeuge.find((w) => w.record_id === selectedWerkzeugId);

  const handleSubmit = async () => {
    if (!selectedHandwerkerId || !selectedWerkzeugId || !ausleihdatum) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await LivingAppsService.createAusleiheEntry({
        handwerker: createRecordUrl(APP_IDS.HANDWERKER, selectedHandwerkerId),
        werkzeug: createRecordUrl(APP_IDS.WERKZEUGE, selectedWerkzeugId),
        ausleihdatum: ausleihdatum,
        geplantes_rueckgabedatum: geplantesRueckgabedatum || undefined,
        status: 'ausgeliehen',
        bemerkungen: bemerkungen || undefined,
      });
      await fetchAll();
      setDone(true);
    } catch {
      setSubmitError(tx('Fehler beim Anlegen der Ausleihe. Bitte versuche es erneut.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setSelectedHandwerkerId(null);
    setSelectedWerkzeugId(null);
    setAusleihdatum(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
    setGeplantesRueckgabedatum('');
    setBemerkungen('');
    setSubmitError(null);
    setDone(false);
  };

  return (
    <IntentWizardShell
      title={tx('Werkzeug ausleihen')}
      subtitle={tx('Handwerker und Werkzeug wählen, Ausleihe anlegen')}
      steps={[
        { label: tx('Handwerker') },
        { label: tx('Werkzeug') },
        { label: tx('Bestätigen') },
      ]}
      currentStep={step}
      onStepChange={setStep}
      loading={loading}
      error={error}
      onRetry={fetchAll}
    >
      {/* Schritt 1: Handwerker wählen */}
      {step === 1 && (
        <EntitySelectStep
          items={aktiveHandwerker.map((h) => ({
            id: h.record_id,
            title:
              [h.fields.vorname, h.fields.nachname].filter(Boolean).join(' ') ||
              h.fields.personalnummer ||
              h.record_id,
            subtitle: [h.fields.abteilung, h.fields.telefon].filter(Boolean).join(' · '),
            status: h.fields.status
              ? { key: h.fields.status.key, label: h.fields.status.label }
              : undefined,
            icon: <IconUser size={20} className="text-primary" />,
          }))}
          onSelect={(id) => {
            setSelectedHandwerkerId(id);
            setStep(2);
          }}
          searchPlaceholder={tx('Handwerker suchen …')}
          emptyText={tx('Keine aktiven Handwerker gefunden.')}
          emptyIcon={<IconUser size={32} className="text-muted-foreground" />}
        />
      )}

      {/* Schritt 2: Werkzeug wählen */}
      {step === 2 && (
        selectedHandwerkerId ? (
          <EntitySelectStep
            items={verfuegbareWerkzeuge.map((w) => ({
              id: w.record_id,
              title: w.fields.werkzeugname || w.fields.inventarnummer || w.record_id,
              subtitle: [
                w.fields.kategorie?.label,
                w.fields.hersteller,
                w.fields.modell,
                w.fields.standort ? tx('Standort: ') + w.fields.standort : undefined,
              ]
                .filter(Boolean)
                .join(' · '),
              status: w.fields.zustand
                ? { key: w.fields.zustand.key, label: w.fields.zustand.label }
                : undefined,
              icon: <IconTool size={20} className="text-primary" />,
            }))}
            onSelect={(id) => {
              setSelectedWerkzeugId(id);
              setStep(3);
            }}
            searchPlaceholder={tx('Werkzeug suchen …')}
            emptyText={tx('Keine verfügbaren Werkzeuge gefunden.')}
            emptyIcon={<IconTool size={32} className="text-muted-foreground" />}
          />
        ) : (
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

      {/* Schritt 3: Bestätigen */}
      {step === 3 && (
        done ? (
          <div className="flex flex-col items-center py-16 space-y-6">
            <div className="rounded-full bg-primary/10 p-4">
              <IconCheck size={40} className="text-primary" />
            </div>
            <div className="text-center space-y-1">
              <h2 className="text-xl font-semibold">{tx('Ausleihe erfolgreich angelegt!')}</h2>
              <p className="text-sm text-muted-foreground">
                {selectedWerkzeug?.fields.werkzeugname || tx('Das Werkzeug')}{' '}
                {tx('wurde ausgeliehen.')}{' '}
              </p>
            </div>
            <div className="flex gap-3 flex-wrap justify-center">
              <Button onClick={handleReset} variant="outline">
                {tx('Neue Ausleihe anlegen')}
              </Button>
              <a href="#/">
                <Button>{tx('Zurück zum Dashboard')}</Button>
              </a>
            </div>
          </div>
        ) : selectedHandwerkerId && selectedWerkzeugId ? (
          <div className="space-y-6 max-w-lg mx-auto">
            {/* Zusammenfassung Auswahl */}
            <div className="rounded-2xl border bg-card p-4 space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                {tx('Auswahl')}
              </h3>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-secondary p-2">
                  <IconUser size={16} className="text-primary shrink-0" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {[selectedHandwerker?.fields.vorname, selectedHandwerker?.fields.nachname]
                      .filter(Boolean)
                      .join(' ') || selectedHandwerkerId}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {selectedHandwerker?.fields.abteilung || ''}
                  </p>
                </div>
                {selectedHandwerker?.fields.status && (
                  <StatusBadge
                    statusKey={selectedHandwerker.fields.status.key}
                    label={selectedHandwerker.fields.status.label}
                    className="ml-auto shrink-0"
                  />
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-secondary p-2">
                  <IconTool size={16} className="text-primary shrink-0" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {selectedWerkzeug?.fields.werkzeugname || selectedWerkzeugId}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {[
                      selectedWerkzeug?.fields.kategorie?.label,
                      selectedWerkzeug?.fields.inventarnummer,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>
                {selectedWerkzeug?.fields.zustand && (
                  <StatusBadge
                    statusKey={selectedWerkzeug.fields.zustand.key}
                    label={selectedWerkzeug.fields.zustand.label}
                    className="ml-auto shrink-0"
                  />
                )}
              </div>
            </div>

            {/* Inline-Mini-Form: Ausleihe-Details */}
            <div className="rounded-2xl border bg-card p-4 space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                {tx('Ausleihe-Details')}
              </h3>

              <div className="space-y-1">
                <Label htmlFor="ausleihdatum" className="text-sm font-medium">
                  {tx('Ausleihdatum')} <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <IconCalendar
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground shrink-0 pointer-events-none"
                  />
                  <Input
                    id="ausleihdatum"
                    type="datetime-local"
                    value={ausleihdatum}
                    onChange={(e) => setAusleihdatum(e.target.value)}
                    className="pl-9"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="geplantes_rueckgabedatum" className="text-sm font-medium">
                  {tx('Geplantes Rückgabedatum')}
                  <span className="text-muted-foreground text-xs ml-1">{tx('(optional)')}</span>
                </Label>
                <Input
                  id="geplantes_rueckgabedatum"
                  type="date"
                  value={geplantesRueckgabedatum}
                  onChange={(e) => setGeplantesRueckgabedatum(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="bemerkungen" className="text-sm font-medium">
                  {tx('Bemerkungen')}
                  <span className="text-muted-foreground text-xs ml-1">{tx('(optional)')}</span>
                </Label>
                <Textarea
                  id="bemerkungen"
                  value={bemerkungen}
                  onChange={(e) => setBemerkungen(e.target.value)}
                  placeholder={tx('Hinweise zur Ausleihe …')}
                  rows={3}
                />
              </div>
            </div>

            {submitError && (
              <p className="text-sm text-destructive rounded-lg bg-destructive/10 px-3 py-2">
                {submitError}
              </p>
            )}

            <div className="flex gap-3 flex-wrap">
              <Button
                variant="outline"
                onClick={() => setStep(2)}
                disabled={submitting}
              >
                {tx('Zurück')}
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting || !ausleihdatum}
                className="flex-1"
              >
                {submitting ? tx('Wird angelegt …') : tx('Ausleihe anlegen')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 space-y-3">
            <p className="text-sm text-muted-foreground">
              {tx('Dieser Schritt braucht die Auswahl aus Schritt 1 und 2.')}
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
