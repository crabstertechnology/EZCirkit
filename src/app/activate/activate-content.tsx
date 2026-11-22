
'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { signInWithCustomToken, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
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
  Home,
  Eye,
  EyeOff,
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
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // --------------------------------------------------------------------------
  // Pre-fill user details if already signed in
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (auth?.currentUser) {
      if (!name && auth.currentUser.displayName) setName(auth.currentUser.displayName);
      if (!email && auth.currentUser.email) setEmail(auth.currentUser.email);
      if (!phone && auth.currentUser.phoneNumber) setPhone(auth.currentUser.phoneNumber);
    }
  }, [auth?.currentUser]);

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
      let data: any = {};
      try {
        const text = await res.text();
        data = text ? JSON.parse(text) : {};
      } catch {
        data = {};
      }

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
          kitId: resolvedKitId,
          name, email, phone, password,
          country, state, college, profession,
        }),
      });

      let data: any = {};
      try {
        const text = await res.text();
        data = text ? JSON.parse(text) : {};
      } catch {
        data = {};
      }

      if (!res.ok) {
        if (data.error === 'email_in_use') {
          setFormError('An account with this email already exists. Please log in instead.');
        } else if (data.error === 'already_activated') {
          setPhase('already-activated');
        } else if (data.error === 'invalid_token') {
          setFormError('The activation token is invalid or has expired.');
        } else {
          setFormError(data.error || `Activation failed (${res.status}). Please try again.`);
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
  // Activate using Google Auth
  // --------------------------------------------------------------------------
  async function handleGoogleActivate() {
    if (!auth) return;
    setFormError('');
    setIsGoogleSubmitting(true);

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const googleUser = result.user;

      const res = await fetch('/api/offline-kits/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: validatedToken,
          kitId: resolvedKitId,
          uid: googleUser.uid,
          name: googleUser.displayName || googleUser.email?.split('@')[0] || 'EZCirkit User',
          email: googleUser.email,
          phone: googleUser.phoneNumber || phone || '',
          country: country || 'India',
          state: state || '',
          college,
          profession,
          authProvider: 'google',
        }),
      });

      let data: any = {};
      try {
        const text = await res.text();
        data = text ? JSON.parse(text) : {};
      } catch {
        data = {};
      }

      if (!res.ok) {
        if (data.error === 'already_activated') {
          setPhase('already-activated');
        } else if (data.error === 'invalid_token') {
          setFormError('The activation token is invalid or has expired.');
        } else {
          setFormError(data.error || `Activation failed (${res.status}). Please try again.`);
        }
        setIsGoogleSubmitting(false);
        return;
      }

      // Send welcome email (fire-and-forget)
      fetch('/api/offline-kits/welcome-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: googleUser.displayName || 'EZCirkit User',
          email: googleUser.email,
          kitId: resolvedKitId,
        }),
      }).catch(() => {});

      setPhase('success');
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
        setFormError(err.message || 'Google authentication failed. Please try again.');
      }
    } finally {
      setIsGoogleSubmitting(false);
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
            <Button onClick={() => router.push('/')}>
              <Home className="h-4 w-4 mr-2" /> Go to Home
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
          <CardContent className="space-y-5">
            {/* Activate using Google Auth */}
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2.5 cursor-pointer h-11 font-medium shadow-sm hover:bg-accent border-2"
              disabled={isSubmitting || isGoogleSubmitting}
              onClick={handleGoogleActivate}
            >
              {isGoogleSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" /> Connecting with Google…
                </>
              ) : (
                <>
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path
                      fill="#EA4335"
                      d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582l3.51-3.51C17.642 1.091 14.974 0 12 0 7.354 0 3.307 2.67 1.296 6.57l3.97 3.195z"
                    />
                    <path
                      fill="#4285F4"
                      d="M23.49 12.275c0-.825-.075-1.62-.21-2.385H12v4.51h6.46c-.28 1.48-1.12 2.73-2.38 3.58l3.7 2.87c2.16-2 3.71-4.935 3.71-8.575z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.266 14.235A7.098 7.098 0 0 1 4.9 12c0-.795.13-1.56.366-2.265L1.296 6.54A11.967 11.967 0 0 0 0 12c0 1.92.455 3.73 1.256 5.34l4.01-3.105z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.97-1.075 7.96-2.915l-3.7-2.87c-1.025.688-2.342 1.1-3.96 1.1-3.055 0-5.64-2.065-6.565-4.845L1.256 17.34C3.267 21.305 7.314 24 12 24z"
                    />
                  </svg>
                  <span>Activate using Google</span>
                </>
              )}
            </Button>

            <div className="relative my-3">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-3 text-muted-foreground font-semibold">Or register with email</span>
              </div>
            </div>

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
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute inset-y-0 right-0 h-full px-3 text-muted-foreground hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      <span className="sr-only">{showPassword ? 'Hide password' : 'Show password'}</span>
                    </Button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirm-password">Confirm Password *</Label>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute inset-y-0 right-0 h-full px-3 text-muted-foreground hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      <span className="sr-only">{showConfirmPassword ? 'Hide password' : 'Show password'}</span>
                    </Button>
                  </div>
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
