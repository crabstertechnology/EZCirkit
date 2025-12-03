
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import AdminSidebar from '@/components/admin/admin-sidebar';
import { doc } from 'firebase/firestore';
import { cn } from '@/lib/utils';


interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const userDocRef = useMemoFirebase(
    () => (!isUserLoading && user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user, isUserLoading]
  );
  const { data: userData, isLoading: isUserDocLoading } = useDoc<{ isAdmin?: boolean }>(userDocRef);

  const isLoading = isUserLoading || isUserDocLoading;

  React.useEffect(() => {
    if (!isLoading && !user) {
      // Not logged in after initial check, redirect to login
      router.replace('/login');
    } else if (!isLoading && userData && !userData.isAdmin) {
      // Logged in but not an admin, redirect to home
      router.replace('/');
    }
  }, [user, userData, isLoading, router]);

  const isAdmin = !isLoading && user && userData?.isAdmin === true;

  if (isLoading || !isAdmin) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Loading or verifying access...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-secondary/50">
      <AdminSidebar
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
      />
       <div className="flex-1 overflow-y-auto">
        <main
          className={cn(
            "p-4 sm:p-6 lg:p-8",
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
