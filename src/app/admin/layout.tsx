
'use client';

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
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
  const pathname = usePathname();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);

  // Automatically collapse sidebar on load or resize if screen width is under 1024px
  React.useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsSidebarCollapsed(true);
      }
    };
    
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Automatically collapse sidebar when navigating to a new admin page on smaller screens
  React.useEffect(() => {
    if (window.innerWidth < 1024) {
      setIsSidebarCollapsed(true);
    }
  }, [pathname]);

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
    <div className="flex h-screen overflow-hidden bg-secondary/50 relative">
      {/* Invisible Hover Zone on Left Corner/Edge to auto-open sidebar */}
      {isSidebarCollapsed && (
        <div 
          onMouseEnter={() => setIsSidebarCollapsed(false)} 
          className="fixed left-0 top-0 w-3 h-screen z-40 cursor-w-resize"
        />
      )}

      <AdminSidebar
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
      />
       <div className="flex-1 overflow-y-auto">
        <main className="p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
