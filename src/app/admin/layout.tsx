
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import AdminSidebar from '@/components/admin/admin-sidebar';
import { doc } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';


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
      <ScrollArea className="flex-1">
        <main
          className={cn(
            "p-8 transition-all duration-300 ease-in-out",
          )}
        >
          {children}
        </main>
      </ScrollArea>
    </div>
  );
}
