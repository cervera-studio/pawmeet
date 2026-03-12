import { Check, Loader2, Send } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { type FormEvent, useState } from 'react';

type FormState = 'idle' | 'loading' | 'success' | 'error';

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true } as const,
};

const inputClasses =
  'w-full px-5 py-3.5 rounded-xl border border-neutral-300 text-neutral-900 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 text-[15px] bg-white';

export default function ContactFormClient() {
  const [state, setState] = useState<FormState>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (state === 'loading' || state === 'success') return;

    setState('loading');
    setErrorMessage('');

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      message: formData.get('message') as string,
    };

    try {
      // TODO: replace with actual API endpoint
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error("Errore durante l'invio");

      setState('success');
    } catch {
      setState('error');
      setErrorMessage('Qualcosa è andato storto. Riprova tra poco.');
      setTimeout(() => setState('idle'), 4000);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
      <motion.div className="text-center mb-12" {...fadeUp} transition={{ duration: 0.5 }}>
        <h1 className="text-[32px] sm:text-[40px] font-bold text-neutral-900">Contattaci</h1>
        <p className="mt-4 text-[17px] text-neutral-700">
          Hai domande, suggerimenti o vuoi collaborare con noi? Scrivici!
        </p>
      </motion.div>

      <AnimatePresence mode="wait">
        {state === 'success' ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-16"
          >
            <motion.div
              className="mx-auto w-16 h-16 rounded-full bg-primary-50 flex items-center justify-center mb-6"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
            >
              <Check size={32} className="text-primary" />
            </motion.div>
            <h2 className="text-[24px] font-bold text-neutral-900">Messaggio inviato!</h2>
            <p className="mt-3 text-[17px] text-neutral-700">
              Grazie per averci scritto. Ti risponderemo al più presto.
            </p>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            onSubmit={handleSubmit}
            className="space-y-6"
            {...fadeUp}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            <div>
              <label
                htmlFor="contact-name"
                className="block text-[13px] font-semibold text-neutral-700 mb-1.5"
              >
                Nome
              </label>
              <input
                type="text"
                id="contact-name"
                name="name"
                required
                autoComplete="name"
                placeholder="Il tuo nome"
                disabled={state === 'loading'}
                className={inputClasses}
              />
            </div>

            <div>
              <label
                htmlFor="contact-email"
                className="block text-[13px] font-semibold text-neutral-700 mb-1.5"
              >
                Email
              </label>
              <input
                type="email"
                id="contact-email"
                name="email"
                required
                autoComplete="email"
                placeholder="La tua email"
                disabled={state === 'loading'}
                className={inputClasses}
              />
            </div>

            <div>
              <label
                htmlFor="contact-message"
                className="block text-[13px] font-semibold text-neutral-700 mb-1.5"
              >
                Messaggio
              </label>
              <textarea
                id="contact-message"
                name="message"
                rows={5}
                required
                placeholder="Scrivi il tuo messaggio..."
                disabled={state === 'loading'}
                className={`${inputClasses} resize-none`}
              />
            </div>

            <motion.button
              type="submit"
              disabled={state === 'loading'}
              className="w-full px-6 py-3.5 rounded-full bg-primary text-white font-semibold text-[15px] disabled:opacity-70 flex items-center justify-center gap-2"
              whileHover={state === 'idle' ? { scale: 0.98 } : {}}
              whileTap={state === 'idle' ? { scale: 0.95 } : {}}
            >
              <AnimatePresence mode="wait">
                {state === 'loading' ? (
                  <motion.span
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2"
                  >
                    <Loader2 size={18} className="animate-spin" />
                    Invio in corso...
                  </motion.span>
                ) : (
                  <motion.span
                    key="idle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2"
                  >
                    <Send size={18} />
                    Invia messaggio
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>

            <AnimatePresence>
              {state === 'error' && (
                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-center text-[15px] text-error font-medium"
                >
                  {errorMessage}
                </motion.p>
              )}
            </AnimatePresence>
          </motion.form>
        )}
      </AnimatePresence>

      <motion.div
        className="mt-12 text-center text-neutral-500 text-[13px]"
        {...fadeUp}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <p>
          Puoi anche scriverci direttamente a{' '}
          <a href="mailto:info@pawmeet.io" className="text-primary hover:underline font-medium">
            info@pawmeet.io
          </a>
        </p>
      </motion.div>
    </div>
  );
}
