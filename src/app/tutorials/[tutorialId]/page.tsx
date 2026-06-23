'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TutorialItemRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/ide');
  }, [router]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-pulse text-zinc-500 font-semibold">Redirecting to EZCirkit IDE...</div>
    </div>
  );
}
