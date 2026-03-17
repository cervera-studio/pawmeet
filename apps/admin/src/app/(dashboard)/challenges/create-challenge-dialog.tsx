'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';
import { DialogForm } from '@/components/dialog-form';
import { Input } from '@/components/ui/input';
import { handleError } from '@/lib/error-handler';
import { createChallenge } from './actions';

const CHALLENGE_TYPES = [
  'walk_count',
  'walk_distance_km',
  'new_matches',
  'group_events_joined',
] as const;

type ChallengeType = (typeof CHALLENGE_TYPES)[number];

function isChallengeType(value: string): value is ChallengeType {
  return (CHALLENGE_TYPES as readonly string[]).includes(value);
}

interface CreateChallengeDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateChallengeDialog({ open, onClose, onCreated }: CreateChallengeDialogProps) {
  const t = useTranslations('challenges');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [type, setType] = useState<ChallengeType>(CHALLENGE_TYPES[0]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetValue, setTargetValue] = useState(1);
  const [xpReward, setXpReward] = useState(50);
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');

  function resetForm() {
    setType(CHALLENGE_TYPES[0]);
    setTitle('');
    setDescription('');
    setTargetValue(1);
    setXpReward(50);
    setStartsAt('');
    setEndsAt('');
  }

  function resetAndClose() {
    resetForm();
    onClose();
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await createChallenge({
        type,
        title,
        description,
        targetValue,
        xpReward,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
      });
      resetAndClose();
      onCreated();
    } catch (error) {
      toast.error(handleError(error, 'Errore durante la creazione della sfida'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <DialogForm
      open={open}
      onClose={resetAndClose}
      title={t('createDialog.title')}
      description={t('createDialog.description')}
      isSubmitting={isSubmitting}
      onSubmit={handleCreate}
      submitLabel={t('createDialog.submit')}
    >
      <div className="space-y-4">
        <div>
          <label htmlFor="challenge-type" className="mb-1 block text-sm font-medium">
            {t('columns.type')}
          </label>
          <select
            id="challenge-type"
            className="w-full rounded-md border border-neutral-200 bg-surface px-3 py-2 text-sm"
            value={type}
            onChange={(e) => {
              if (isChallengeType(e.target.value)) setType(e.target.value);
            }}
          >
            {CHALLENGE_TYPES.map((ct) => (
              <option key={ct} value={ct}>
                {t(`types.${ct}`)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="challenge-title" className="mb-1 block text-sm font-medium">
            {t('columns.title')}
          </label>
          <Input
            id="challenge-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('createDialog.titlePlaceholder')}
            required
          />
        </div>

        <div>
          <label htmlFor="challenge-description" className="mb-1 block text-sm font-medium">
            {t('createDialog.descriptionLabel')}
          </label>
          <textarea
            id="challenge-description"
            className="w-full rounded-md border border-neutral-200 bg-surface px-3 py-2 text-sm"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('createDialog.descriptionPlaceholder')}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="challenge-target" className="mb-1 block text-sm font-medium">
              {t('columns.target')}
            </label>
            <Input
              id="challenge-target"
              type="number"
              min={1}
              value={targetValue}
              onChange={(e) => setTargetValue(Number(e.target.value))}
              required
            />
          </div>
          <div>
            <label htmlFor="challenge-xp" className="mb-1 block text-sm font-medium">
              {t('columns.xpReward')}
            </label>
            <Input
              id="challenge-xp"
              type="number"
              min={1}
              value={xpReward}
              onChange={(e) => setXpReward(Number(e.target.value))}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="challenge-starts" className="mb-1 block text-sm font-medium">
              {t('columns.startsAt')}
            </label>
            <Input
              id="challenge-starts"
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="challenge-ends" className="mb-1 block text-sm font-medium">
              {t('columns.endsAt')}
            </label>
            <Input
              id="challenge-ends"
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              required
            />
          </div>
        </div>
      </div>
    </DialogForm>
  );
}
