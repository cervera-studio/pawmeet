'use client';

import { useTranslations } from 'next-intl';
import type { UseFormReturn } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import type { BreedFormValues } from '@/lib/schemas/breed';

export const SIZE_CATEGORIES = ['toy', 'piccola', 'media', 'grande', 'gigante'] as const;
export type SizeCategory = (typeof SIZE_CATEGORIES)[number];

export const BREED_GROUPS = [
  'Herding',
  'Hound',
  'Non-Sporting',
  'Sporting',
  'Terrier',
  'Toy',
  'Working',
  'Miscellaneous',
] as const;

export const SCORE_FIELDS = [
  'energy',
  'playfulness',
  'trainability',
  'barking',
  'goodWithOtherDogs',
  'goodWithChildren',
  'goodWithStrangers',
  'protectiveness',
  'shedding',
  'grooming',
] as const;
export type ScoreField = (typeof SCORE_FIELDS)[number];

export const DEFAULT_SCORES: Record<ScoreField, number | null> = {
  energy: null,
  playfulness: null,
  trainability: null,
  barking: null,
  goodWithOtherDogs: null,
  goodWithChildren: null,
  goodWithStrangers: null,
  protectiveness: null,
  shedding: null,
  grooming: null,
};

export function isSizeCategory(v: string): v is SizeCategory {
  return (SIZE_CATEGORIES as readonly string[]).includes(v);
}

function ScoreInput({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  error?: string;
}) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm">{label}</span>
        <select
          className="w-20 rounded-md border border-neutral-200 bg-surface px-2 py-1 text-sm"
          value={value ?? ''}
          onChange={(e) => {
            const v = e.target.value;
            onChange(v === '' ? null : Number(v));
          }}
        >
          <option value="">-</option>
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

interface BreedFormFieldsProps {
  idPrefix: string;
  form: UseFormReturn<BreedFormValues>;
}

export function BreedFormFields({ idPrefix, form }: BreedFormFieldsProps) {
  const t = useTranslations('breeds');
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = form;

  return (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor={`${idPrefix}-code`}>
          {t('columns.code')}
        </label>
        <Input
          id={`${idPrefix}-code`}
          {...register('code')}
          placeholder={t('createDialog.codePlaceholder')}
        />
        {errors.code && <p className="text-xs text-red-600">{errors.code.message}</p>}
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor={`${idPrefix}-group`}>
          {t('columns.group')}
        </label>
        <select
          id={`${idPrefix}-group`}
          className="w-full rounded-md border border-neutral-200 bg-surface px-3 py-2 text-sm"
          {...register('group')}
        >
          {BREED_GROUPS.map((group) => (
            <option key={group} value={group}>
              {group}
            </option>
          ))}
        </select>
        {errors.group && <p className="text-xs text-red-600">{errors.group.message}</p>}
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor={`${idPrefix}-size`}>
          {t('columns.sizeCategory')}
        </label>
        <select
          id={`${idPrefix}-size`}
          className="w-full rounded-md border border-neutral-200 bg-surface px-3 py-2 text-sm"
          {...register('sizeCategory')}
        >
          {SIZE_CATEGORIES.map((size) => (
            <option key={size} value={size}>
              {t(
                `sizes.${size}` as
                  | 'sizes.toy'
                  | 'sizes.piccola'
                  | 'sizes.media'
                  | 'sizes.grande'
                  | 'sizes.gigante',
              )}
            </option>
          ))}
        </select>
        {errors.sizeCategory && (
          <p className="text-xs text-red-600">{errors.sizeCategory.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor={`${idPrefix}-weight`}>
          {t('columns.avgWeightKg')}
        </label>
        <Input
          id={`${idPrefix}-weight`}
          type="number"
          {...register('avgWeightKg')}
          min={0}
          step={0.1}
        />
        {errors.avgWeightKg && <p className="text-xs text-red-600">{errors.avgWeightKg.message}</p>}
      </div>
      <div className="space-y-2">
        <span className="text-sm font-medium">{t('scores.title')}</span>
        <div className="grid grid-cols-2 gap-2">
          {SCORE_FIELDS.map((field) => (
            <ScoreInput
              key={field}
              label={t(`columns.${field}` as Parameters<typeof t>[0])}
              value={watch(field) ?? null}
              onChange={(v) => setValue(field, v, { shouldValidate: true })}
              error={errors[field]?.message}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
