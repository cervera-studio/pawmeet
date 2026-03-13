import {
  CalendarDays,
  Dog,
  type LucideIcon,
  MapPin,
  MessageCircle,
  Route,
  Sparkles,
} from 'lucide-react';
import { motion } from 'motion/react';
import { features } from '../data/features';
import type { TranslationDictionary } from '../i18n';

const iconMap: Record<string, LucideIcon> = {
  Sparkles,
  MapPin,
  MessageCircle,
  Dog,
  CalendarDays,
  Route,
};

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.08,
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    },
  }),
};

interface Props {
  strings: TranslationDictionary['features'];
}

export default function FeaturesClient({ strings }: Props) {
  return (
    <section className="py-24 sm:py-32 bg-neutral-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-[28px] sm:text-[32px] font-bold text-neutral-900">
            {strings.heading}
          </h2>
          <p className="mt-4 text-[17px] text-neutral-700 max-w-2xl mx-auto">
            {strings.description}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => {
            const Icon = iconMap[feature.iconName];
            const featureStrings = strings.items[feature.id as keyof typeof strings.items];
            return (
              <motion.div
                key={feature.id}
                custom={i}
                variants={cardVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                whileHover={{ y: -6, transition: { type: 'spring', stiffness: 300, damping: 20 } }}
                className={`relative rounded-2xl p-7 transition-shadow ${
                  feature.highlighted
                    ? 'bg-primary-50 border-2 border-primary shadow-md'
                    : 'bg-surface-elevated shadow-sm hover:shadow-md'
                }`}
              >
                {feature.comingSoon && (
                  <span className="absolute top-4 right-4 text-[11px] font-semibold uppercase tracking-wider text-neutral-600 bg-neutral-100 px-2.5 py-1 rounded-full">
                    {strings.comingSoonLabel}
                  </span>
                )}
                <div
                  className={`inline-flex items-center justify-center w-11 h-11 rounded-xl mb-5 ${
                    feature.highlighted
                      ? 'bg-primary text-white'
                      : 'bg-neutral-100 text-neutral-700'
                  }`}
                >
                  {Icon && <Icon size={22} strokeWidth={2} />}
                </div>
                <h3 className="text-[17px] font-semibold text-neutral-900 mb-2">
                  {featureStrings.title}
                </h3>
                <p className="text-[15px] leading-relaxed text-neutral-600">
                  {featureStrings.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
