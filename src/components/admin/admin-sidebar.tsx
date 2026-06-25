
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Logo from '@/components/shared/logo';
import { ADMIN_NAV_LINKS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useAuth } from '@/firebase';
import { handleLogout } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { Separator } from '../ui/separator';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { ScrollArea } from '../ui/scroll-area';

interface AdminSidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (isCollapsed: boolean) => void;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ isCollapsed, setIsCollapsed }) => {
  const pathname = usePathname();
  const auth = useAuth();
  const router = useRouter();

  const doLogout = () => {
    handleLogout(auth).then(() => {
      router.push('/');
    });
  }

  const isSubPage = (href: string) => {
    if (href === '/admin') return false; // Exclude the base dashboard page
    // Check if the current path starts with the link's href, and is not just the link itself if it's a parent route
    // This logic handles nested routes, e.g., /admin/users/123 should light up /admin/users
    return pathname.startsWith(href);
  }

  return (
    <aside 
      onMouseLeave={() => setIsCollapsed(true)}
      className={cn(
        "h-screen flex-shrink-0 bg-background flex flex-col transition-all duration-300 ease-in-out overflow-hidden z-40",
        isCollapsed ? "w-0 border-r-0 invisible" : "w-64 border-r"
      )}
    >
       <div className={cn("flex items-center", isCollapsed ? "justify-center" : "justify-between", "p-4 h-16 border-b flex-shrink-0")}>
        {!isCollapsed && <Logo />}
        <Button variant="ghost" size="icon" onClick={() => setIsCollapsed(!isCollapsed)}>
          {isCollapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
          <span className="sr-only">Toggle Sidebar</span>
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <nav className="px-2 space-y-2 py-4">
          {ADMIN_NAV_LINKS.map((link, index) => {
            // Exact match for the dashboard, startsWith for others.
            const isActive = link.href === '/admin' ? pathname === link.href : pathname.startsWith(link.href);
            
            if (link.href === '/') {
              return (
                <React.Fragment key={link.label}>
                  <Link href={link.href}>
                    <Button
                      variant='ghost'
                      className={cn("w-full justify-start gap-2", isCollapsed && "justify-center")}
                    >
                      <link.icon className="h-5 w-5" />
                      {!isCollapsed && link.label}
                    </Button>
                  </Link>
                  <Separator className="my-2" />
                </React.Fragment>
              )
            }
            return (
              <Link href={link.href} key={link.label}>
                <Button
                  variant={isActive ? 'secondary' : 'ghost'}
                  className={cn("w-full justify-start gap-2", isCollapsed && "justify-center")}
                >
                  <link.icon className="h-5 w-5" />
                  {!isCollapsed && link.label}
                </Button>
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      <div className="p-2 border-t flex-shrink-0">
        <Button
          variant='ghost'
          className={cn("w-full justify-start gap-2", isCollapsed && "justify-center")}
          onClick={doLogout}
        >
          <LogOut className="h-5 w-5" />
          {!isCollapsed && "Log Out"}
        </Button>
      </div>
    </aside>
  );
};

export default AdminSidebar;
