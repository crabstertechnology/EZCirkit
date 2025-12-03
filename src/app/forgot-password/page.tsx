
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { KeyRound, ArrowLeft } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const auth = useAuth();
  const { toast } = useToast();

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !email) return;

    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setIsSent(true);
      toast({
        title: 'Password Reset Email Sent',
        description: `Check your inbox at ${email} for instructions.`,
      });
    } catch (error: any) {
      console.error("Password Reset Error:", error);
      toast({
        variant: 'destructive',
        title: 'Error Sending Email',
        description: 'Could not send reset email. Please ensure the email address is correct and try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center min-h-screen bg-secondary">
      <Card className="mx-auto max-w-sm w-full">
        <CardHeader className="text-center">
          <KeyRound className="mx-auto h-10 w-10 text-primary" />
          <CardTitle className="text-2xl">Forgot Password</CardTitle>
          <CardDescription>
            {isSent
              ? 'A link to reset your password has been sent to your email.'
              : 'Enter your email to receive a password reset link.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isSent ? (
            <form onSubmit={handleResetPassword} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading || !email}>
                {isLoading ? 'Sending...' : 'Send Reset Link'}
              </Button>
            </form>
          ) : (
             <Button asChild className="w-full">
              <Link href="/login" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Login
              </Link>
            </Button>
          )}
           <div className="mt-4 text-center text-sm">
             {!isSent && (
                <Link href="/login" className="underline">
                  Nevermind, I remember!
                </Link>
             )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
