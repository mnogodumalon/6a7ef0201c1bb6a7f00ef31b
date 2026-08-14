import type { Ausleihe, ReparaturWartung } from './app';

export type EnrichedAusleihe = Ausleihe & {
  handwerkerName: string;
  werkzeugName: string;
};

export type EnrichedReparaturWartung = ReparaturWartung & {
  werkzeugName: string;
  verantwortlicher_handwerkerName: string;
};
