'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { handleError } from '@/lib/error-handler';
import { addSponsorToEvent, fetchEventSponsors, removeSponsorFromEvent } from '../actions';

interface EventSponsor {
  id: string;
  eventId: string;
  organizationId: string;
  tier: string;
  logoPlacement: string;
  createdAt: string;
  organizationName: string;
  organizationLogoUrl: string | null;
}

const tierConfig: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }
> = {
  title: { label: 'Title', variant: 'default' },
  gold: { label: 'Gold', variant: 'secondary' },
  silver: { label: 'Silver', variant: 'outline' },
  partner: { label: 'Partner', variant: 'outline' },
};

const placementLabels: Record<string, string> = {
  header: 'Header',
  footer: 'Footer',
  banner: 'Banner',
};

export function SponsorsSection({
  eventId,
  initialSponsors,
}: {
  eventId: string;
  initialSponsors: EventSponsor[];
}) {
  const tt = useTranslations('toast');
  const [sponsors, setSponsors] = useState<EventSponsor[]>(initialSponsors);
  const [showAddForm, setShowAddForm] = useState(false);
  const [orgId, setOrgId] = useState('');
  const [tier, setTier] = useState<string>('partner');
  const [placement, setPlacement] = useState<string>('footer');
  const [loading, setLoading] = useState(false);

  async function handleAdd() {
    if (!orgId) return;
    setLoading(true);
    try {
      await addSponsorToEvent(eventId, orgId, tier, placement);
      const result = await fetchEventSponsors(eventId);
      setSponsors(result);
      setOrgId('');
      setShowAddForm(false);
    } catch (error) {
      toast.error(handleError(error, tt('events.sponsorAddError')));
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove(organizationId: string) {
    setLoading(true);
    try {
      await removeSponsorFromEvent(eventId, organizationId);
      setSponsors((prev) => prev.filter((s) => s.organizationId !== organizationId));
    } catch (error) {
      toast.error(handleError(error, tt('events.sponsorRemoveError')));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Sponsor</h3>
        <Button size="sm" variant="outline" onClick={() => setShowAddForm(!showAddForm)}>
          {showAddForm ? 'Annulla' : 'Aggiungi sponsor'}
        </Button>
      </div>

      {showAddForm && (
        <div className="rounded-md border p-4 space-y-3">
          <Input
            placeholder="Organization ID"
            value={orgId}
            onChange={(e) => setOrgId(e.target.value)}
          />
          <div className="flex gap-3">
            <select
              className="rounded-md border px-3 py-2 text-sm"
              value={tier}
              onChange={(e) => setTier(e.target.value)}
            >
              <option value="title">Title</option>
              <option value="gold">Gold</option>
              <option value="silver">Silver</option>
              <option value="partner">Partner</option>
            </select>
            <select
              className="rounded-md border px-3 py-2 text-sm"
              value={placement}
              onChange={(e) => setPlacement(e.target.value)}
            >
              <option value="header">Header</option>
              <option value="footer">Footer</option>
              <option value="banner">Banner</option>
            </select>
            <Button size="sm" onClick={handleAdd} disabled={loading || !orgId}>
              Aggiungi
            </Button>
          </div>
        </div>
      )}

      {sponsors.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nessuno sponsor associato.</p>
      ) : (
        <div className="space-y-2">
          {sponsors.map((s) => (
            <div key={s.id} className="flex items-center justify-between rounded-md border p-3">
              <div className="flex items-center gap-3">
                {s.organizationLogoUrl && (
                  <Image
                    src={s.organizationLogoUrl}
                    alt=""
                    width={32}
                    height={32}
                    className="h-8 w-8 rounded-full object-cover"
                  />
                )}
                <div>
                  <span className="font-medium">{s.organizationName}</span>
                  <div className="flex gap-2 mt-1">
                    <Badge variant={tierConfig[s.tier]?.variant ?? 'outline'}>
                      {tierConfig[s.tier]?.label ?? s.tier}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {placementLabels[s.logoPlacement] ?? s.logoPlacement}
                    </span>
                  </div>
                </div>
              </div>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleRemove(s.organizationId)}
                disabled={loading}
              >
                Rimuovi
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
