import { lookupLabel } from '@/i18n';

// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
export type GeoLocation = { lat: number; long: number; info?: string };

export type AttachmentType = 'file' | 'note' | 'url' | 'json';
export interface Attachment {
  id: string;
  type: AttachmentType;
  label: string | null;
  value: string | null;
  active: boolean;
  createdat?: string | null;
  updatedat?: string | null;
}

export interface AttachmentInput {
  type: AttachmentType;
  label?: string;
  value: string;
  active?: boolean;
}

export interface Handwerker {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    vorname?: string;
    nachname?: string;
    personalnummer?: string;
    telefon?: string;
    email?: string;
    abteilung?: string;
    status?: LookupValue;
    bemerkungen?: string;
  };
}

export interface Werkzeuge {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    werkzeugname?: string;
    inventarnummer?: string;
    kategorie?: LookupValue;
    hersteller?: string;
    modell?: string;
    kaufdatum?: string; // Format: YYYY-MM-DD oder ISO String
    zustand?: LookupValue;
    standort?: string;
    foto?: string;
    bemerkungen?: string;
  };
}

export interface Ausleihe {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    handwerker?: string; // applookup -> URL zu 'Handwerker' Record
    werkzeug?: string; // applookup -> URL zu 'Werkzeuge' Record
    ausleihdatum?: string; // Format: YYYY-MM-DD oder ISO String
    geplantes_rueckgabedatum?: string; // Format: YYYY-MM-DD oder ISO String
    tatsaechliches_rueckgabedatum?: string; // Format: YYYY-MM-DD oder ISO String
    status?: LookupValue;
    bemerkungen?: string;
  };
}

export interface ReparaturWartung {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    werkzeug?: string; // applookup -> URL zu 'Werkzeuge' Record
    art?: LookupValue;
    beschreibung?: string;
    startdatum?: string; // Format: YYYY-MM-DD oder ISO String
    enddatum?: string; // Format: YYYY-MM-DD oder ISO String
    verantwortlicher_handwerker?: string; // applookup -> URL zu 'Handwerker' Record
    status?: LookupValue;
    kosten?: number;
    bemerkungen?: string;
  };
}

export const APP_IDS = {
  HANDWERKER: '6a7eeffd614badd3dad19a9e',
  WERKZEUGE: '6a7ef0025f3a87a155619815',
  AUSLEIHE: '6a7ef003ef896c702feec808',
  REPARATUR_WARTUNG: '6a7ef0043a715a524a547c07',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'handwerker': {
    status: [{ key: "aktiv", get label() { return lookupLabel('handwerker', 'status', "aktiv") ?? "Aktiv"; } }, { key: "inaktiv", get label() { return lookupLabel('handwerker', 'status', "inaktiv") ?? "Inaktiv"; } }],
  },
  'werkzeuge': {
    kategorie: [{ key: "messgeraet", get label() { return lookupLabel('werkzeuge', 'kategorie', "messgeraet") ?? "Messgerät"; } }, { key: "handwerkzeug", get label() { return lookupLabel('werkzeuge', 'kategorie', "handwerkzeug") ?? "Handwerkzeug"; } }, { key: "elektrowerkzeug", get label() { return lookupLabel('werkzeuge', 'kategorie', "elektrowerkzeug") ?? "Elektrowerkzeug"; } }, { key: "pruefgeraet", get label() { return lookupLabel('werkzeuge', 'kategorie', "pruefgeraet") ?? "Prüfgerät"; } }, { key: "sonstiges", get label() { return lookupLabel('werkzeuge', 'kategorie', "sonstiges") ?? "Sonstiges"; } }],
    zustand: [{ key: "gut", get label() { return lookupLabel('werkzeuge', 'zustand', "gut") ?? "Gut"; } }, { key: "beschaedigt", get label() { return lookupLabel('werkzeuge', 'zustand', "beschaedigt") ?? "Beschädigt"; } }, { key: "ausser_betrieb", get label() { return lookupLabel('werkzeuge', 'zustand', "ausser_betrieb") ?? "Außer Betrieb"; } }],
  },
  'ausleihe': {
    status: [{ key: "ausgeliehen", get label() { return lookupLabel('ausleihe', 'status', "ausgeliehen") ?? "Ausgeliehen"; } }, { key: "zurueckgegeben", get label() { return lookupLabel('ausleihe', 'status', "zurueckgegeben") ?? "Zurückgegeben"; } }],
  },
  'reparatur_wartung': {
    art: [{ key: "reparatur", get label() { return lookupLabel('reparatur_wartung', 'art', "reparatur") ?? "Reparatur"; } }, { key: "wartung", get label() { return lookupLabel('reparatur_wartung', 'art', "wartung") ?? "Wartung"; } }],
    status: [{ key: "offen", get label() { return lookupLabel('reparatur_wartung', 'status', "offen") ?? "Offen"; } }, { key: "in_bearbeitung", get label() { return lookupLabel('reparatur_wartung', 'status', "in_bearbeitung") ?? "In Bearbeitung"; } }, { key: "abgeschlossen", get label() { return lookupLabel('reparatur_wartung', 'status', "abgeschlossen") ?? "Abgeschlossen"; } }],
  },
};

// Optimistic LookupValue writes: never re-type a label — resolve the schema
// option instead (its label is a locale-aware getter; falls back to the key).
// WRONG: status: { key: 'offen', label: 'Offen' }   (frozen in one language)
// RIGHT: status: lookupOption('<appKey>', 'status', 'offen')
export function lookupOption(app: string, field: string, key: string): LookupValue {
  return LOOKUP_OPTIONS[app]?.[field]?.find(o => o.key === key) ?? { key, label: key };
}

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'handwerker': {
    'vorname': 'string/text',
    'nachname': 'string/text',
    'personalnummer': 'string/text',
    'telefon': 'string/tel',
    'email': 'string/email',
    'abteilung': 'string/text',
    'status': 'lookup/radio',
    'bemerkungen': 'string/textarea',
  },
  'werkzeuge': {
    'werkzeugname': 'string/text',
    'inventarnummer': 'string/text',
    'kategorie': 'lookup/select',
    'hersteller': 'string/text',
    'modell': 'string/text',
    'kaufdatum': 'date/date',
    'zustand': 'lookup/radio',
    'standort': 'string/text',
    'foto': 'file',
    'bemerkungen': 'string/textarea',
  },
  'ausleihe': {
    'handwerker': 'applookup/select',
    'werkzeug': 'applookup/select',
    'ausleihdatum': 'date/datetimeminute',
    'geplantes_rueckgabedatum': 'date/date',
    'tatsaechliches_rueckgabedatum': 'date/date',
    'status': 'lookup/radio',
    'bemerkungen': 'string/textarea',
  },
  'reparatur_wartung': {
    'werkzeug': 'applookup/select',
    'art': 'lookup/radio',
    'beschreibung': 'string/textarea',
    'startdatum': 'date/date',
    'enddatum': 'date/date',
    'verantwortlicher_handwerker': 'applookup/select',
    'status': 'lookup/select',
    'kosten': 'number',
    'bemerkungen': 'string/textarea',
  },
};

export const HUB_TOPOLOGY: Record<string, { field: string; entity: string }[]> = {
};

// Aliases for the pre-0.0.279 app keys (see 4c).
LOOKUP_OPTIONS['reparatur_&_wartung'] = LOOKUP_OPTIONS['reparatur_wartung'];
FIELD_TYPES['reparatur_&_wartung'] = FIELD_TYPES['reparatur_wartung'];

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateHandwerker = StripLookup<Handwerker['fields']>;
export type CreateWerkzeuge = StripLookup<Werkzeuge['fields']>;
export type CreateAusleihe = StripLookup<Ausleihe['fields']>;
export type CreateReparaturWartung = StripLookup<ReparaturWartung['fields']>;