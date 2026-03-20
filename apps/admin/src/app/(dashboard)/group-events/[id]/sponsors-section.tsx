'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { handleError } from '@/lib/error-handler';
import {
  addSponsorToEvent,
  fetchEventSponsors,
  fetchVerifiedOrganizations,
  removeSponsorFromEvent,
} from '../actions';

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

interface OrgOption {
  id: string;
  name: string;
  type: string;
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

const orgTypeLabels: Record<string, string> = {
  pawmeet_team: 'PawMeet Team',
  association: 'Associazione',
  educator: 'Educatore',
  brand: 'Brand',
};

function OrgPicker({ value, onChange }: { value: string; onChange: (orgId: string) => void }) {
  const [query, setQuery] = useState('');
  const [organizations, setOrganizations] = useState<OrgOption[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedName, setSelectedName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      setIsLoading(true);
      try {
        const orgs = await fetchVerifiedOrganizations();
        if (active) {
          setOrganizations(
            orgs.map((o: { id: string; name: string; type: string }) => ({
              id: o.id,
              name: o.name,
              type: o.type,
            })),
          );
        }
      } catch {
        // Silently fail — user can retry
      } finally {
        if (active) setIsLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  const filtered = organizations.filter(
    (org) =>
      org.name.toLowerCase().includes(query.toLowerCase()) ||
      org.type.toLowerCase().includes(query.toLowerCase()),
  );

  const handleSelect = useCallback(
    (org: OrgOption) => {
      onChange(org.id);
      setSelectedName(org.name);
      setQuery('');
      setIsOpen(false);
    },
    [onChange],
  );

  function handleClear() {
    onChange('');
    setSelectedName('');
    setQuery('');
  }

  // Close dropdown on outside click
  useEffect(() => {
    function listener(e: MouseEvent) {
      if (!containerRef.current || containerRef.current.contains(e.target as Node)) return;
      setIsOpen(false);
    }
    document.addEventListener('mousedown', listener);
    return () => document.removeEventListener('mousedown', listener);
  }, []);

  if (value && selectedName) {
    return (
      <div className="flex items-center gap-2 rounded-md border px-3 py-2">
        <span className="flex-1 text-sm">{selectedName}</span>
        <button
          type="button"
          onClick={handleClear}
          className="text-xs text-neutral-500 hover:text-neutral-700"
        >
          &times;
        </button>
      </div>
    );
  }

  return (
    <div className="relative" ref={containerRef}>
      <Input
        placeholder={isLoading ? 'Caricamento organizzazioni...' : 'Cerca organizzazione...'}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        disabled={isLoading}
      />
      {isOpen && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-md border bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
          {filtered.map((org) => (
            <button
              key={org.id}
              type="button"
              onClick={() => handleSelect(org)}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              <span className="font-medium">{org.name}</span>
              <span className="text-xs text-neutral-500">
                {orgTypeLabels[org.type] ?? org.type}
              </span>
            </button>
          ))}
        </div>
      )}
      {isOpen && !isLoading && query && filtered.length === 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-white px-3 py-2 text-sm text-neutral-500 shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
          Nessuna organizzazione trovata
        </div>
      )}
    </div>
  );
}

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
          <OrgPicker value={orgId} onChange={setOrgId} />
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
