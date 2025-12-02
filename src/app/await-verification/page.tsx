
'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MailCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

function AwaitVerification() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');

  useEffect(() => {
    const userEmail = searchParams.get('email');
    if (userEmail) {
      setEmail(userEmail);
    }
  }, [searchParams]);


  return (
    <div className="flex items-center min-h-screen bg-secondary">
      <Card className="mx-auto max-w-sm w-full">
        <CardHeader className="text-center">
          <MailCheck className="mx-auto h-10 w-10 text-green-500" />
          <CardTitle className="text-2xl">Verify Your Email</CardTitle>
          <CardDescription>
            A verification link has been sent to{' '}
            <span className="font-semibold text-foreground">{email}</span>. Please
            check your inbox and click the link to complete your registration.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
           <p className="text-center text-sm text-muted-foreground">
            Once your email is verified, you can log in with your credentials.
          </p>
          <Button onClick={() => router.push('/login')} className="w-full">
            Back to Login
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// Wrap the component in Suspense because useSearchParams() is used
export default function AwaitVerificationPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><p>Loading...</p></div>}>
            <AwaitVerification />
        </Suspense>
    )
}
