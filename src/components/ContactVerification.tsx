/**
 * ContactVerification.tsx
 * Inline verification widget for email or phone fields.
 * Shows "Verify" button → OTP input → "Verified" badge.
 *
 * Used in DashboardProfile next to the email/phone inputs.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, Loader2, Mail, Phone, ShieldCheck, AlertCircle } from 'lucide-react';
import { useSendVerificationCode, useVerifyCode } from '@/hooks/useVerification';

type Channel = 'email' | 'phone';

interface ContactVerificationProps {
  listingId: string;
  listingType: 'practitioner' | 'center';
  channel: Channel;
  /** Current value of the field (email address or phone number) */
  value: string;
  /** Whether this channel is already verified */
  verified: boolean;
  /** Called after successful verification */
  onVerified?: () => void;
}

type Step = 'idle' | 'sending' | 'enter-code' | 'verifying' | 'verified';

export function ContactVerification({
  listingId,
  listingType,
  channel,
  value,
  verified,
  onVerified,
}: ContactVerificationProps) {
  const [step, setStep] = useState<Step>(verified ? 'verified' : 'idle');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [maskedDest, setMaskedDest] = useState('');

  const sendCode = useSendVerificationCode();
  const verifyCode = useVerifyCode();

  const Icon = channel === 'email' ? Mail : Phone;
  const channelLabel = channel === 'email' ? 'email' : 'phone';

  // Already verified
  if (verified || step === 'verified') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
        <CheckCircle className="h-3 w-3" /> Verified
      </span>
    );
  }

  // No value to verify
  if (!value.trim()) {
    return null;
  }

  // Idle — show verify button
  if (step === 'idle') {
    return (
      <Button
        variant="outline"
        size="sm"
        className="h-7 text-xs gap-1"
        onClick={async () => {
          setStep('sending');
          setError('');
          try {
            const result = await sendCode.mutateAsync({
              listingId,
              listingType,
              channel,
            });
            setMaskedDest(result.destination);
            setStep('enter-code');
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to send code');
            setStep('idle');
          }
        }}
      >
        <ShieldCheck className="h-3 w-3" />
        Verify {channelLabel}
      </Button>
    );
  }

  // Sending spinner
  if (step === 'sending') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" /> Sending code…
      </span>
    );
  }

  // Enter code
  return (
    <div className="mt-2 space-y-2">
      <p className="text-xs text-muted-foreground">
        <Icon className="inline h-3 w-3 mr-1" />
        Code sent to {maskedDest}. Enter it below:
      </p>

      {error && (
        <Alert variant="destructive" className="py-2">
          <AlertCircle className="h-3 w-3" />
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex gap-2">
        <Input
          placeholder="123456"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          maxLength={6}
          className="w-28 text-center tracking-[0.3em] h-8 text-sm"
        />
        <Button
          size="sm"
          className="h-8"
          disabled={code.length !== 6 || step === 'verifying'}
          onClick={async () => {
            setStep('verifying');
            setError('');
            try {
              const result = await verifyCode.mutateAsync({
                listingId,
                listingType,
                channel,
                code,
              });
              if (result.success) {
                setStep('verified');
                onVerified?.();
              } else {
                setError(result.error || 'Invalid code. Try again.');
                setStep('enter-code');
              }
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Verification failed');
              setStep('enter-code');
            }
          }}
        >
          {step === 'verifying' ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            'Verify'
          )}
        </Button>
      </div>

      <div className="flex gap-3">
        <button
          className="text-xs text-muted-foreground hover:text-foreground"
          onClick={async () => {
            setCode('');
            setError('');
            setStep('sending');
            try {
              const result = await sendCode.mutateAsync({
                listingId,
                listingType,
                channel,
              });
              setMaskedDest(result.destination);
              setStep('enter-code');
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Failed to resend');
              setStep('enter-code');
            }
          }}
        >
          Resend code
        </button>
        <button
          className="text-xs text-muted-foreground hover:text-foreground"
          onClick={() => { setStep('idle'); setCode(''); setError(''); }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
