import type { EnrichedAusleihe, EnrichedReparaturWartung } from '@/types/enriched';
import type { Ausleihe, Handwerker, ReparaturWartung, Werkzeuge } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveDisplay(url: unknown, map: Map<string, any>, ...fields: string[]): string {
  if (!url) return '';
  const id = extractRecordId(url);
  if (!id) return '';
  const r = map.get(id);
  if (!r) return '';
  return fields.map(f => String(r.fields[f] ?? '')).join(' ').trim();
}

interface AusleiheMaps {
  handwerkerMap: Map<string, Handwerker>;
  werkzeugeMap: Map<string, Werkzeuge>;
}

export function enrichAusleihe(
  ausleihe: Ausleihe[],
  maps: AusleiheMaps
): EnrichedAusleihe[] {
  return ausleihe.map(r => ({
    ...r,
    handwerkerName: resolveDisplay(r.fields.handwerker, maps.handwerkerMap, 'vorname', 'nachname'),
    werkzeugName: resolveDisplay(r.fields.werkzeug, maps.werkzeugeMap, 'werkzeugname'),
  }));
}

interface ReparaturWartungMaps {
  werkzeugeMap: Map<string, Werkzeuge>;
  handwerkerMap: Map<string, Handwerker>;
}

export function enrichReparaturWartung(
  reparaturWartung: ReparaturWartung[],
  maps: ReparaturWartungMaps
): EnrichedReparaturWartung[] {
  return reparaturWartung.map(r => ({
    ...r,
    werkzeugName: resolveDisplay(r.fields.werkzeug, maps.werkzeugeMap, 'werkzeugname'),
    verantwortlicher_handwerkerName: resolveDisplay(r.fields.verantwortlicher_handwerker, maps.handwerkerMap, 'vorname', 'nachname'),
  }));
}
