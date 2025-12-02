
'use client';

import React, { ComponentType, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';

export function withPublicRoute<P extends object>(WrappedComponent: ComponentType<P>) {
  const WithPublicRoute = (props: P) => {
    const { user, isUserLoading } = useUser();
    const router = useRouter();

    useEffect(() => {
      // Don't redirect if we are still loading the user state.
      // The redirect should only happen once the user state is definitively known.
      if (!isUserLoading && user) {
        router.replace('/profile');
      }
    }, [user, isUserLoading, router]);

    // Show a loading screen while the initial user state is being determined.
    // This also handles the flicker during the redirect sign-in process.
    if (isUserLoading || user) {
      return (
        <div className="flex h-screen items-center justify-center">
            <p>Loading...</p>
        </div>
      );
    }

    // If the user is not logged in and we are done loading, render the public component.
    return <WrappedComponent {...props} />;
  };

  WithPublicRoute.displayName = `withPublicRoute(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;

  return WithPublicRoute;
}
