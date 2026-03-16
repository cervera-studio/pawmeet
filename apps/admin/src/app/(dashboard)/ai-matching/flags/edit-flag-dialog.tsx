'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

interface Flag {
  name: string;
  enabled: boolean;
  splitPercent: number;
}

interface EditFlagDialogProps {
  flag: Flag | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (name: string, enabled: boolean, splitPercent: number) => void;
  isPending?: boolean;
}

export function EditFlagDialog({
  flag,
  open,
  onOpenChange,
  onSave,
  isPending,
}: EditFlagDialogProps) {
  const [enabled, setEnabled] = useState(false);
  const [splitPercent, setSplitPercent] = useState(50);

  useEffect(() => {
    if (flag) {
      setEnabled(flag.enabled);
      setSplitPercent(flag.splitPercent);
    }
  }, [flag]);

  function handleSave() {
    if (!flag) return;
    onSave(flag.name, enabled, splitPercent);
  }

  if (!flag) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifica flag</DialogTitle>
          <DialogDescription>
            <span className="font-mono">{flag.name}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Status radio group */}
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-neutral-900 dark:text-neutral-50">
              Stato
            </legend>
            <div className="flex gap-4">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="flag-status"
                  checked={enabled}
                  onChange={() => setEnabled(true)}
                  className="h-4 w-4 accent-blue-600"
                />
                <span className="text-sm">Attivo</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="flag-status"
                  checked={!enabled}
                  onChange={() => setEnabled(false)}
                  className="h-4 w-4 accent-blue-600"
                />
                <span className="text-sm">Disattivato</span>
              </label>
            </div>
          </fieldset>

          {/* Split percentage */}
          <div className="space-y-2">
            <label
              className="text-sm font-medium text-neutral-900 dark:text-neutral-50"
              htmlFor="split-pct"
            >
              Percentuale split (treatment)
            </label>
            <div className="flex items-center gap-2">
              <Input
                id="split-pct"
                type="number"
                min={0}
                max={100}
                value={splitPercent}
                onChange={(e) => setSplitPercent(Number(e.target.value))}
                className="w-24"
              />
              <span className="text-sm text-neutral-500">%</span>
            </div>
            <p className="text-xs text-neutral-500">
              Control: {100 - splitPercent}% / Treatment: {splitPercent}%
            </p>
          </div>

          {/* Warning */}
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              Attenzione: la modifica di questo flag influenza il comportamento del matching in
              produzione. Assicurati di aver verificato l&apos;impatto prima di salvare.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Annulla
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? 'Salvataggio...' : 'Salva'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
