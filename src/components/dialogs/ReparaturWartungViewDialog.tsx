import type { ReparaturWartung, Werkzeuge, Handwerker } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { APP_IDS } from '@/types/app';
import { AttachmentsSection } from '@/components/AttachmentsSection';
import { Badge } from '@/components/ui/badge';
import { IconPencil } from '@tabler/icons-react';
import { t, appLabel, fieldLabel, lookupLabel, dateFnsLocale, dateFormat } from '@/i18n';
import { format, parseISO } from 'date-fns';

function formatDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), dateFormat(), { locale: dateFnsLocale() }); } catch { return d; }
}

interface ReparaturWartungViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: ReparaturWartung | null;
  onEdit: (record: ReparaturWartung) => void;
  werkzeugeList: Werkzeuge[];
  handwerkerList: Handwerker[];
}

export function ReparaturWartungViewDialog({ open, onClose, record, onEdit, werkzeugeList, handwerkerList }: ReparaturWartungViewDialogProps) {
  function getWerkzeugeDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return werkzeugeList.find(r => r.record_id === id)?.fields.werkzeugname ?? '—';
  }

  function getHandwerkerDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return handwerkerList.find(r => r.record_id === id)?.fields.vorname ?? '—';
  }

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('view_entity', { entity: appLabel('reparatur_wartung') })}</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            {t('edit_button')}
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('reparatur_wartung', 'werkzeug')}</Label>
            <p className="text-sm">{getWerkzeugeDisplayName(record.fields.werkzeug)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('reparatur_wartung', 'art')}</Label>
            <Badge variant="secondary">{lookupLabel('reparatur_wartung', 'art', record.fields.art?.key) ?? record.fields.art?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('reparatur_wartung', 'beschreibung')}</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.beschreibung ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('reparatur_wartung', 'startdatum')}</Label>
            <p className="text-sm">{formatDate(record.fields.startdatum)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('reparatur_wartung', 'enddatum')}</Label>
            <p className="text-sm">{formatDate(record.fields.enddatum)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('reparatur_wartung', 'verantwortlicher_handwerker')}</Label>
            <p className="text-sm">{getHandwerkerDisplayName(record.fields.verantwortlicher_handwerker)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('reparatur_wartung', 'status')}</Label>
            <Badge variant="secondary">{lookupLabel('reparatur_wartung', 'status', record.fields.status?.key) ?? record.fields.status?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('reparatur_wartung', 'kosten')}</Label>
            <p className="text-sm">{record.fields.kosten ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('reparatur_wartung', 'bemerkungen')}</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.bemerkungen ?? '—'}</p>
          </div>
          <div className="pt-2 border-t border-border">
            <AttachmentsSection appId={APP_IDS.REPARATUR_WARTUNG} recordId={record.record_id} readOnly />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}