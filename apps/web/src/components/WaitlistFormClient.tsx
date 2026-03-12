import { useState, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Loader2 } from 'lucide-react';

type FormState = 'idle' | 'loading' | 'success' | 'error';

export default function WaitlistFormClient() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<FormState>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (state === 'loading' || state === 'success') return;

    setState('loading');
    setErrorMessage('');

    try {
      // TODO: replace with actual API endpoint
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) throw new Error('Errore durante l\'iscrizione');

      setState('success');
      setEmail('');
    } catch {
      setState('error');
      setErrorMessage('Qualcosa e andato storto. Riprova tra poco.');
      setTimeout(() => setState('idle'), 4000);
    }
  };

  return (
    <section className="py-24 sm:py-32 bg-primary-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.h2
          className="text-[28px] sm:text-[32px] font-bold text-neutral-900"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          Entra nella lista d'attesa
        </motion.h2>
        <motion.p
          className="mt-4 text-[17px] text-neutral-700"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          Sii tra i primi a provare PawMeet. Lascia la tua email e ti avviseremo al lancio.
        </motion.p>

        <motion.form
          onSubmit={handleSubmit}
          className="mt-8 flex flex-col sm:flex-row items-center gap-3 max-w-md mx-auto"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <label htmlFor="waitlist-email-react" className="sr-only">
            Il tuo indirizzo email
          </label>
          <input
            type="email"
            id="waitlist-email-react"
            name="email"
            required
            autoComplete="email"
            placeholder="La tua email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={state === 'loading' || state === 'success'}
            className="w-full flex-1 px-5 py-3.5 rounded-full border border-neutral-300 text-neutral-900 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 text-[15px]"
          />
          <motion.button
            type="submit"
            disabled={state === 'loading' || state === 'success'}
            className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-primary text-white font-semibold text-[15px] disabled:opacity-70 flex items-center justify-center gap-2 min-w-[140px]"
            whileHover={state === 'idle' ? { scale: 0.98 } : {}}
            whileTap={state === 'idle' ? { scale: 0.95 } : {}}
          >
            <AnimatePresence mode="wait">
              {state === 'loading' && (
                <motion.span
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2"
                >
                  <Loader2 size={18} className="animate-spin" />
                  Iscrizione...
                </motion.span>
              )}
              {state === 'success' && (
                <motion.span
                  key="success"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-2"
                >
                  <Check size={18} />
                  Iscritto!
                </motion.span>
              )}
              {(state === 'idle' || state === 'error') && (
                <motion.span
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  Iscrivimi
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </motion.form>

        <AnimatePresence>
          {state === 'success' && (
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-4 text-[15px] text-primary font-medium"
            >
              Controlla la tua email per confermare.
            </motion.p>
          )}
          {state === 'error' && (
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-4 text-[15px] text-red-600 font-medium"
            >
              {errorMessage}
            </motion.p>
          )}
        </AnimatePresence>

        {state !== 'success' && state !== 'error' && (
          <p className="mt-4 text-[13px] text-neutral-500">
            Niente spam, promesso. Solo aggiornamenti importanti.
          </p>
        )}
      </div>
    </section>
  );
}
