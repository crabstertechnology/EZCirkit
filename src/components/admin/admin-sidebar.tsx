
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
    <aside className={cn(
      "h-screen flex-shrink-0 bg-background border-r flex flex-col transition-all duration-300 ease-in-out",
      isCollapsed ? "w-20" : "w-64"
    )}>
       <div className={cn("flex items-center", isCollapsed ? "justify-center" : "justify-between", "p-4 h-16 border-b flex-shrink-0")}>
        {!isCollapsed && <Logo />}
        <Button variant="ghost" size="icon" onClick={() => setIsCollapsed(!isCollapsed)}>
          {isCollapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
          <span className="sr-only">Toggle Sidebar</span>
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <nav className="px-2 space-y-2 py-4">
          <TooltipProvider delayDuration={0}>
            {ADMIN_NAV_LINKS.map((link, index) => {
              // Exact match for the dashboard, startsWith for others.
              const isActive = link.href === '/admin' ? pathname === link.href : pathname.startsWith(link.href);
              
              if (link.href === '/') {
                return (
                  <React.Fragment key={link.label}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link href={link.href}>
                            <Button
                              variant='ghost'
                              className={cn("w-full justify-start gap-2", isCollapsed && "justify-center")}
                            >
                              <link.icon className="h-5 w-5" />
                              {!isCollapsed && link.label}
                            </Button>
                          </Link>
                        </TooltipTrigger>
                        {isCollapsed && <TooltipContent side="right">{link.label}</TooltipContent>}
                      </Tooltip>
                    <Separator className="my-2" />
                  </React.Fragment>
                )
              }
              return (
                <Tooltip key={link.label}>
                  <TooltipTrigger asChild>
                    <Link href={link.href}>
                      <Button
                        variant={isActive ? 'secondary' : 'ghost'}
                        className={cn("w-full justify-start gap-2", isCollapsed && "justify-center")}
                      >
                        <link.icon className="h-5 w-5" />
                        {!isCollapsed && link.label}
                      </Button>
                    </Link>
                  </TooltipTrigger>
                  {isCollapsed && <TooltipContent side="right">{link.label}</TooltipContent>}
                </Tooltip>
              );
            })}
          </TooltipProvider>
        </nav>
      </ScrollArea>

      <div className="p-2 border-t flex-shrink-0">
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant='ghost'
                className={cn("w-full justify-start gap-2", isCollapsed && "justify-center")}
                onClick={doLogout}
              >
                <LogOut className="h-5 w-5" />
                {!isCollapsed && "Log Out"}
              </Button>
            </TooltipTrigger>
            {isCollapsed && <TooltipContent side="right">Log Out</TooltipContent>}
          </Tooltip>
        </TooltipProvider>
      </div>
    </aside>
  );
};

export default AdminSidebar;
