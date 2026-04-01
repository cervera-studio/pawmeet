import { ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import type { TranslationDictionary } from '../i18n';

interface Props {
  strings: TranslationDictionary['hero'];
}

export default function HeroClient({ strings }: Props) {
  return (
    <section className="relative overflow-hidden bg-surface">
      {/* Atmospheric gradient — barely there, like morning light */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% 0%, var(--color-primary-50) 0%, transparent 70%), radial-gradient(ellipse 50% 40% at 80% 100%, var(--color-secondary-50) 0%, transparent 60%)',
        }}
      />

      <div className="relative z-10 max-w-5xl mx-auto px-6 sm:px-8 pt-32 sm:pt-40 lg:pt-48 pb-24 sm:pb-32 lg:pb-40">
        <div className="max-w-4xl">
          {/* Eyebrow — minimal, purposeful */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="mb-8"
          >
            <span className="inline-flex items-center gap-2.5 text-[13px] font-medium tracking-[0.08em] uppercase text-neutral-600">
              <span className="w-8 h-[1px] bg-secondary" aria-hidden="true" />
              {strings.eyebrow}
            </span>
          </motion.div>

          {/* Headline — editorial serif, massive, left-aligned */}
          <h1 className="font-serif text-[clamp(2.75rem,7vw,5.5rem)] leading-[1.05] tracking-[-0.02em] text-neutral-900">
            {strings.headlinePart1}
            <br className="hidden sm:block" /> {strings.headlinePart2}{' '}
            <em className="relative not-italic text-primary-text">
              {strings.headlineHighlight}
              <motion.span
                className="absolute -bottom-1 left-0 w-full h-[2px] bg-secondary origin-left"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.8, delay: 0.9, ease: [0.22, 1, 0.36, 1] }}
                aria-hidden="true"
              />
            </em>
          </h1>

          {/* Subtitle — clean, restrained, generous width */}
          <p className="mt-8 text-[18px] sm:text-[20px] leading-[1.65] text-neutral-700 max-w-xl">
            {strings.subtitle}
          </p>

          {/* CTA group */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="mt-12 flex flex-wrap items-center gap-6"
          >
            {/* Primary CTA — the event */}
            <motion.a
              href={strings.ctaHref}
              className="group relative inline-flex items-center gap-3 px-8 py-4 bg-neutral-900 text-surface rounded-full text-[15px] font-semibold tracking-wide overflow-hidden"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            >
              {/* Shimmer sweep on hover */}
              <span
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.08] to-transparent opacity-0 group-hover:opacity-100 group-hover:animate-[shimmer-sweep_1.5s_ease-in-out]"
                aria-hidden="true"
              />
              <span className="relative">{strings.ctaPrimary}</span>
              <ArrowRight
                size={16}
                strokeWidth={2}
                className="relative transition-transform duration-300 group-hover:translate-x-1"
              />
            </motion.a>

            {/* Secondary — text link, editorial */}
            <a
              href={strings.ctaSecondaryHref}
              className="group inline-flex items-center gap-1.5 text-[15px] font-medium text-neutral-600 hover:text-neutral-900 transition-colors duration-300"
            >
              {strings.ctaSecondary}
              <span
                className="inline-block w-4 h-[1px] bg-current transition-all duration-300 group-hover:w-6"
                aria-hidden="true"
              />
            </a>
          </motion.div>
        </div>
      </div>

      {/* Bottom fade to next section */}
      <div
        className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-neutral-50 to-transparent pointer-events-none"
        aria-hidden="true"
      />
    </section>
  );
}
