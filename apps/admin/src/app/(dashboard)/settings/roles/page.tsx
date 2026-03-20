import { getTranslations } from 'next-intl/server';
import { RolesMatrix } from './roles-matrix';

export default async function RolesPage() {
  const t = await getTranslations('roles');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">{t('title')}</h1>
        <p className="text-neutral-500">{t('subtitle')}</p>
      </div>
      <RolesMatrix />
    </div>
  );
}
