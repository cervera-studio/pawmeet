'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuthContext } from '@/lib/auth-store';

type MfaStep = 'idle' | 'setup' | 'verify' | 'disable';

interface SetupData {
  uri: string;
  secret: string;
}

export function MfaSettings() {
  const t = useTranslations('settings.mfa');
  const { user } = useAuthContext();

  const [step, setStep] = useState<MfaStep>('idle');
  const [setupData, setSetupData] = useState<SetupData | null>(null);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [mfaEnabled, setMfaEnabled] = useState(user?.totpEnabled ?? false);

  const handleStartSetup = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/mfa-setup', { method: 'POST' });
      const data = await res.json();

      if (!res.ok) {
        if (data.error?.includes('già attivo')) {
          setMfaEnabled(true);
          toast.info(t('alreadyEnabled'));
        } else {
          toast.error(data.error ?? t('setupError'));
        }
        return;
      }

      setSetupData(data);
      setStep('setup');
    } catch {
      toast.error(t('setupError'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  const handleConfirm = useCallback(async () => {
    if (code.length !== 6) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/mfa-confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? t('confirmError'));
        return;
      }

      setMfaEnabled(true);
      setStep('idle');
      setSetupData(null);
      setCode('');
      toast.success(t('enabledSuccess'));
    } catch {
      toast.error(t('confirmError'));
    } finally {
      setIsLoading(false);
    }
  }, [code, t]);

  const handleDisable = useCallback(async () => {
    if (code.length !== 6 || !password) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/mfa-disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, code }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? t('disableError'));
        return;
      }

      setMfaEnabled(false);
      setStep('idle');
      setCode('');
      setPassword('');
      toast.success(t('disabledSuccess'));
    } catch {
      toast.error(t('disableError'));
    } finally {
      setIsLoading(false);
    }
  }, [code, password, t]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldIcon className="h-5 w-5" />
          {t('cardTitle')}
        </CardTitle>
        <CardDescription>{t('cardDescription')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {step === 'idle' && !mfaEnabled && (
          <>
            <p className="text-sm text-neutral-600">
              {t('notEnabled')}
              {user?.role === 'super_admin' && (
                <span className="ml-1 text-amber-600 font-medium">
                  {t('requiredForSuperAdmin')}
                </span>
              )}
            </p>
            <Button onClick={handleStartSetup} disabled={isLoading}>
              {isLoading ? t('settingUp') : t('enableButton')}
            </Button>
          </>
        )}

        {step === 'idle' && mfaEnabled && (
          <>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-sm font-medium text-green-700">{t('enabled')}</span>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                setStep('disable');
                setCode('');
                setPassword('');
              }}
            >
              {t('disableButton')}
            </Button>
          </>
        )}

        {step === 'setup' && setupData && (
          <div className="space-y-4">
            <p className="text-sm text-neutral-600">{t('scanQr')}</p>

            {/* QR code via Google Charts API (no extra dependency) */}
            <div className="flex justify-center">
              <Image
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(setupData.uri)}`}
                alt="TOTP QR Code"
                width={200}
                height={200}
                unoptimized
                className="rounded-lg border border-neutral-200"
              />
            </div>

            <div className="space-y-1">
              <p className="text-xs text-neutral-500">{t('manualEntry')}</p>
              <code className="block rounded bg-neutral-100 px-3 py-2 text-sm font-mono break-all select-all">
                {setupData.secret}
              </code>
            </div>

            <div className="space-y-2">
              <label htmlFor="verifyCode" className="text-sm font-medium text-neutral-700">
                {t('verifyLabel')}
              </label>
              <Input
                id="verifyCode"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                className="max-w-[200px] text-center text-xl tracking-[0.3em] font-mono"
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleConfirm} disabled={isLoading || code.length !== 6}>
                {isLoading ? t('verifying') : t('confirmButton')}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setStep('idle');
                  setSetupData(null);
                  setCode('');
                }}
              >
                {t('cancelButton')}
              </Button>
            </div>
          </div>
        )}

        {step === 'disable' && (
          <div className="space-y-4">
            <p className="text-sm text-neutral-600">{t('disableDescription')}</p>

            <div className="space-y-2">
              <label htmlFor="disablePassword" className="text-sm font-medium text-neutral-700">
                {t('passwordLabel')}
              </label>
              <Input
                id="disablePassword"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="max-w-sm"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="disableCode" className="text-sm font-medium text-neutral-700">
                {t('codeLabel')}
              </label>
              <Input
                id="disableCode"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                className="max-w-[200px] text-center text-xl tracking-[0.3em] font-mono"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="destructive"
                onClick={handleDisable}
                disabled={isLoading || code.length !== 6 || !password}
              >
                {isLoading ? t('disabling') : t('confirmDisable')}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setStep('idle');
                  setCode('');
                  setPassword('');
                }}
              >
                {t('cancelButton')}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <title>Shield</title>
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    </svg>
  );
}
