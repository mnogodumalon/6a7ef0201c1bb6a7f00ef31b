import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Handwerker, Werkzeuge, Ausleihe, ReparaturWartung } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';
import { t } from '@/i18n';

/** Dashboard data + the OPTIMISTIC-WRITE API.
 *
 *  The per-entity setters (`set<Entity>`) are exported for exactly one job:
 *  optimistic updates on drag writes (onEventDrop / onEventResize /
 *  onCardMove). Call the setter FIRST — the bar/card lands instantly — then
 *  fire the PATCH in the background and call `fetchAll()` ONLY in the catch.
 *  Never await the PATCH before updating state (the UI freezes for the full
 *  round-trip on every drag) and never refetch after a successful write.
 *  There is no other mechanism (no `__optimistic`, no `mutate`).
 */
export function useDashboardData() {
  const [handwerker, setHandwerker] = useState<Handwerker[]>([]);
  const [werkzeuge, setWerkzeuge] = useState<Werkzeuge[]>([]);
  const [ausleihe, setAusleihe] = useState<Ausleihe[]>([]);
  const [reparaturWartung, setReparaturWartung] = useState<ReparaturWartung[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [handwerkerData, werkzeugeData, ausleiheData, reparaturWartungData] = await Promise.all([
        LivingAppsService.getHandwerker(),
        LivingAppsService.getWerkzeuge(),
        LivingAppsService.getAusleihe(),
        LivingAppsService.getReparaturWartung(),
      ]);
      setHandwerker(handwerkerData);
      setWerkzeuge(werkzeugeData);
      setAusleihe(ausleiheData);
      setReparaturWartung(reparaturWartungData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(t('data_load_failed')));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Silent background refresh (no loading state change → no flicker)
  useEffect(() => {
    async function silentRefresh() {
      try {
        const [handwerkerData, werkzeugeData, ausleiheData, reparaturWartungData] = await Promise.all([
          LivingAppsService.getHandwerker(),
          LivingAppsService.getWerkzeuge(),
          LivingAppsService.getAusleihe(),
          LivingAppsService.getReparaturWartung(),
        ]);
        setHandwerker(handwerkerData);
        setWerkzeuge(werkzeugeData);
        setAusleihe(ausleiheData);
        setReparaturWartung(reparaturWartungData);
      } catch {
        // silently ignore — stale data is better than no data
      }
    }
    function handleRefresh() { void silentRefresh(); }
    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => window.removeEventListener('dashboard-refresh', handleRefresh);
  }, []);

  const handwerkerMap = useMemo(() => {
    const m = new Map<string, Handwerker>();
    handwerker.forEach(r => m.set(r.record_id, r));
    return m;
  }, [handwerker]);

  const werkzeugeMap = useMemo(() => {
    const m = new Map<string, Werkzeuge>();
    werkzeuge.forEach(r => m.set(r.record_id, r));
    return m;
  }, [werkzeuge]);

  return { handwerker, setHandwerker, werkzeuge, setWerkzeuge, ausleihe, setAusleihe, reparaturWartung, setReparaturWartung, loading, error, fetchAll, handwerkerMap, werkzeugeMap };
}