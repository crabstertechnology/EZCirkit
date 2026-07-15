
'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { signInWithCustomToken } from 'firebase/auth';
import { useAuth } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  QrCode,
  ShieldCheck,
  BookOpen,
} from 'lucide-react';

// --------------------------------------------------------------------------
// Types
// --------------------------------------------------------------------------
type Phase = 'loading' | 'no-token' | 'invalid' | 'already-activated' | 'form' | 'success';

const COUNTRIES = ['India', 'United States', 'United Kingdom', 'Canada', 'Australia', 'Other'];
const INDIA_STATES = [
  'Andhra Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
  'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala',
  'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu & Kashmir', 'Ladakh', 'Puducherry', 'Chandigarh',
];

// --------------------------------------------------------------------------
export default function ActivatePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const auth = useAuth();

  const [phase, setPhase] = useState<Phase>('loading');
  const [validatedToken, setValidatedToken] = useState('');
  const [resolvedKitId, setResolvedKitId] = useState('');

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [country, setCountry] = useState('India');
  const [state, setState] = useState('');
  const [college, setCollege] = useState('');
  const [profession, setProfession] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --------------------------------------------------------------------------
  // On mount: read QR token from URL
  // --------------------------------------------------------------------------
  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      validateToken(token);
    } else {
      // No token in URL → show no-token message
      setPhase('no-token');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function validateToken(token: string) {
    setPhase('loading');
    try {
      const res = await fetch(`/api/offline-kits/validate?token=${encodeURIComponent(token)}`);
      const data = await res.json();

      if (!data.valid) {
        if (data.reason === 'already_activated') {
          setResolvedKitId(data.kitId || '');
          setPhase('already-activated');
        } else {
          setPhase('invalid');
        }
        return;
      }

      setValidatedToken(data.token);
      setResolvedKitId(data.kitId);
      setPhase('form');
    } catch {
      setPhase('invalid');
    }
  }

  // --------------------------------------------------------------------------
  // Registration form submit
  // --------------------------------------------------------------------------
  async function handleActivate(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');

    if (!name || !email || !phone || !password || !country) {
      setFormError('Please fill in all required fields.');
      return;
    }
    if (password !== confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setFormError('Password must be at least 6 characters.');
      return;
    }
    if (!acceptTerms) {
      setFormError('Please accept the Terms & Conditions to continue.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/offline-kits/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: validatedToken,
          name, email, phone, password,
          country, state, college, profession,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === 'email_in_use') {
          setFormError('An account with this email already exists. Please log in instead.');
        } else if (data.error === 'already_activated') {
          setPhase('already-activated');
        } else {
          setFormError(data.error || 'Activation failed. Please try again.');
        }
        setIsSubmitting(false);
        return;
      }

      // Sign in the user automatically
      if (data.customToken && auth) {
        try {
          await signInWithCustomToken(auth, data.customToken);
        } catch {
          // Login failed — user can still log in manually
        }
      }

      // Send welcome email (fire-and-forget)
      fetch('/api/offline-kits/welcome-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, kitId: resolvedKitId }),
      }).catch(() => {});

      setPhase('success');
    } catch (err: any) {
      setFormError(err.message || 'Unexpected error. Please try again.');
      setIsSubmitting(false);
    }
  }

  // --------------------------------------------------------------------------
  // Render helpers
  // --------------------------------------------------------------------------

  if (phase === 'loading') {
    return (
      <Screen>
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Validating your kit…</p>
        </div>
      </Screen>
    );
  }

  if (phase === 'invalid') {
    return (
      <Screen>
        <StatusCard
          icon={<XCircle className="h-12 w-12 text-destructive" />}
          title="Invalid QR Code"
          description="This activation link is not valid. Please check your kit packaging or scan the QR code again."
          badgeText="Invalid"
          badgeVariant="destructive"
        />
      </Screen>
    );
  }

  if (phase === 'already-activated') {
    return (
      <Screen>
        <StatusCard
          icon={<AlertTriangle className="h-12 w-12 text-amber-500" />}
          title="Already Activated"
          description={`Kit ${resolvedKitId || ''} has already been registered. If this is your kit, please log in to your account.`}
          badgeText="Activated"
          badgeVariant="secondary"
        >
          <Button onClick={() => router.push('/login')}>Log In</Button>
        </StatusCard>
      </Screen>
    );
  }

  if (phase === 'success') {
    return (
      <Screen>
        <StatusCard
          icon={<CheckCircle className="h-12 w-12 text-green-500" />}
          title="Kit Activated! 🎉"
          description={`Your kit ${resolvedKitId} has been successfully activated. You now have full access to all tutorials and resources.`}
          badgeText="Activated"
          badgeVariant="default"
        >
          <div className="flex flex-wrap gap-3 justify-center">
            <Button onClick={() => router.push('/dashboard')}>
              <BookOpen className="h-4 w-4 mr-2" /> Go to Dashboard
            </Button>
            <Button variant="outline" onClick={() => router.push('/ide')}>
              Open EZCirkit IDE
            </Button>
          </div>
        </StatusCard>
      </Screen>
    );
  }

  if (phase === 'no-token') {
    return (
      <Screen>
        <StatusCard
          icon={<QrCode className="h-12 w-12 text-primary" />}
          title="Scan QR Code to Activate"
          description="Please scan the QR code printed on your physical kit packaging to activate your product and register your account."
          badgeText="QR Code Required"
          badgeVariant="outline"
        />
      </Screen>
    );
  }

  // phase === 'form'
  return (
    <Screen>
      <div className="w-full max-w-lg">
        {/* Kit badge */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <ShieldCheck className="h-5 w-5 text-green-500" />
          <span className="text-sm text-muted-foreground">Kit verified:</span>
          <Badge variant="outline" className="font-mono text-sm">{resolvedKitId}</Badge>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create Your Account</CardTitle>
            <CardDescription>
              Register to unlock tutorials, circuit diagrams, and the EZCirkit IDE.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleActivate} className="space-y-4">
              {/* Name + Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input id="phone" type="tel" placeholder="+91 9999999999" value={phone} onChange={(e) => setPhone(e.target.value)} required />
              </div>

              {/* Password + Confirm */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password *</Label>
                  <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirm-password">Confirm Password *</Label>
                  <Input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                </div>
              </div>

              {/* Country + State */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="country">Country *</Label>
                  <Select value={country} onValueChange={setCountry}>
                    <SelectTrigger id="country">
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="state">State {country === 'India' ? '*' : ''}</Label>
                  {country === 'India' ? (
                    <Select value={state} onValueChange={setState}>
                      <SelectTrigger id="state">
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent>
                        {INDIA_STATES.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input id="state" value={state} onChange={(e) => setState(e.target.value)} />
                  )}
                </div>
              </div>

              {/* College + Profession */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="college">College / School <span className="text-muted-foreground text-xs">(optional)</span></Label>
                  <Input id="college" value={college} onChange={(e) => setCollege(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="profession">Profession <span className="text-muted-foreground text-xs">(optional)</span></Label>
                  <Input id="profession" placeholder="e.g. Student, Engineer" value={profession} onChange={(e) => setProfession(e.target.value)} />
                </div>
              </div>

              {/* Terms */}
              <div className="flex items-start gap-3 pt-1">
                <Checkbox
                  id="terms"
                  checked={acceptTerms}
                  onCheckedChange={(v) => setAcceptTerms(Boolean(v))}
                />
                <Label htmlFor="terms" className="text-sm leading-snug cursor-pointer">
                  I agree to the{' '}
                  <a href="/terms-and-conditions" target="_blank" className="text-primary underline">
                    Terms &amp; Conditions
                  </a>{' '}
                  and{' '}
                  <a href="/privacy-policy" target="_blank" className="text-primary underline">
                    Privacy Policy
                  </a>
                  .
                </Label>
              </div>

              {formError && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{formError}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Activating…</>
                ) : (
                  'Activate Kit & Create Account'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </Screen>
  );
}

// --------------------------------------------------------------------------
// Small layout helpers
// --------------------------------------------------------------------------
function Screen({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-16">
      {/* Logo / Brand */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center gap-2 text-2xl font-black tracking-tight">
          <span className="text-primary">EZ</span>Cirkit
        </div>
        <p className="text-xs text-muted-foreground mt-1">Kit Activation Portal</p>
      </div>
      {children}
    </div>
  );
}

function StatusCard({
  icon,
  title,
  description,
  badgeText,
  badgeVariant,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  badgeText: string;
  badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline';
  children?: React.ReactNode;
}) {
  return (
    <Card className="w-full max-w-md text-center">
      <CardContent className="pt-8 pb-6 space-y-4">
        <div className="flex justify-center">{icon}</div>
        <Badge variant={badgeVariant}>{badgeText}</Badge>
        <CardTitle>{title}</CardTitle>
        <CardDescription className="text-sm">{description}</CardDescription>
        {children && <div className="pt-2">{children}</div>}
      </CardContent>
    </Card>
  );
}
