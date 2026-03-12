import type { Locale } from '../i18n/locales';
import { getPrivacySections } from '../data/privacy-sections';
import AccordionClient from './AccordionClient';

interface Props {
  locale: Locale;
}

export default function PrivacyAccordionClient({ locale }: Props) {
  const sections = getPrivacySections(locale);
  return <AccordionClient items={sections} defaultOpen="1" />;
}
