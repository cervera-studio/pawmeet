import { Heart, type LucideIcon, PawPrint, TreePine } from 'lucide-react';
import { motion } from 'motion/react';
import { steps } from '../data/steps';
import type { TranslationDictionary } from '../i18n';

const iconMap: Record<string, LucideIcon> = {
  PawPrint,
  Heart,
  TreePine,
};

interface Props {
  strings: TranslationDictionary['steps'];
}

export default function HowItWorksClient({ strings }: Props) {
  return (
    <section id={strings.sectionId} className="py-24 sm:py-32 bg-surface-elevated">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
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

        {/* Timeline */}
        <div className="relative">
          {/* Connector line — desktop only */}
          <div className="hidden md:block absolute top-12 left-[calc(16.67%-1px)] right-[calc(16.67%-1px)] h-0.5 bg-neutral-200" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
            {steps.map((step, i) => {
              const Icon = iconMap[step.iconName];
              const stepStrings = strings.items[step.id as keyof typeof strings.items];
              return (
                <motion.div
                  key={step.number}
                  className="relative text-center"
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{
                    delay: i * 0.15,
                    duration: 0.5,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  {/* Step circle */}
                  <div className="relative z-10 inline-flex items-center justify-center w-24 h-24 rounded-full bg-primary-50 mb-6">
                    <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary text-white">
                      {Icon && <Icon size={28} strokeWidth={1.8} />}
                    </div>
                  </div>

                  {/* Step number */}
                  <div className="text-[13px] font-semibold text-primary uppercase tracking-wider mb-2">
                    {strings.stepLabel} {step.number}
                  </div>

                  <h3 className="text-[20px] font-semibold text-neutral-900 mb-3">
                    {stepStrings.title}
                  </h3>
                  <p className="text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-500 max-w-xs mx-auto">
                    {stepStrings.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
