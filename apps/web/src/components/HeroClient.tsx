import { motion } from 'framer-motion';

const container = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

export default function HeroClient() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary-50 via-white to-secondary-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32 lg:py-40">
        <motion.div
          className="max-w-3xl mx-auto text-center"
          variants={container}
          initial="hidden"
          animate="visible"
        >
          <motion.h1
            variants={item}
            className="text-[32px] sm:text-[40px] lg:text-[48px] font-bold tracking-tight text-neutral-900 leading-[1.15]"
          >
            Trova il compagno di passeggiata{' '}
            <span className="text-secondary-700">perfetto</span>{' '}
            per il tuo cane
          </motion.h1>

          <motion.p
            variants={item}
            className="mt-6 text-[17px] sm:text-[19px] leading-relaxed text-neutral-700 max-w-2xl mx-auto"
          >
            Connettiti con altri proprietari di cani nella tua zona. Organizza passeggiate,
            trova nuovi amici per il tuo amico a quattro zampe e rendi ogni uscita un'avventura.
          </motion.p>

          <motion.div
            variants={item}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <motion.a
              href="/waitlist"
              className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-primary text-white font-semibold text-[17px] shadow-lg shadow-primary/20"
              whileHover={{ scale: 0.98, boxShadow: '0 8px 32px rgba(6, 95, 70, 0.3)' }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              Iscriviti alla waitlist
            </motion.a>
            <a
              href="#come-funziona"
              className="text-primary font-semibold text-[17px] hover:underline underline-offset-4 decoration-2"
            >
              Scopri come funziona &darr;
            </a>
          </motion.div>
        </motion.div>
      </div>

      {/* Animated decorative blobs */}
      <motion.div
        className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary-100 rounded-full opacity-20 blur-3xl"
        animate={{
          scale: [1, 1.05, 1],
          rotate: [0, 3, 0],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      <motion.div
        className="absolute bottom-0 right-0 translate-x-1/3 translate-y-1/3 w-[400px] h-[400px] bg-secondary-100 rounded-full opacity-20 blur-3xl"
        animate={{
          scale: [1, 1.08, 1],
          rotate: [0, -3, 0],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
    </section>
  );
}
