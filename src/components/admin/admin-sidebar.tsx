'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Logo from '@/components/shared/logo';
import { ADMIN_NAV_LINKS, AdminNavLink } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { LogOut, PanelLeftClose, PanelLeftOpen, ChevronDown, ChevronRight } from 'lucide-react';
import { useAuth } from '@/firebase';
import { handleLogout } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { Separator } from '../ui/separator';
import { ScrollArea } from '../ui/scroll-area';

interface AdminSidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (isCollapsed: boolean) => void;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ isCollapsed, setIsCollapsed }) => {
  const pathname = usePathname();
  const auth = useAuth();
  const router = useRouter();

  // Keep track of which parent categories are expanded
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    Billing: true,
  });

  // Automatically keep parent group open when viewing any of its sub-pages
  useEffect(() => {
    ADMIN_NAV_LINKS.forEach((link) => {
      if (link.subItems?.some((sub) => pathname === sub.href)) {
        setOpenGroups((prev) => ({ ...prev, [link.label]: true }));
      }
    });
  }, [pathname]);

  const toggleGroup = (groupLabel: string) => {
    setOpenGroups((prev) => ({
      ...prev,
      [groupLabel]: !prev[groupLabel],
    }));
  };

  const doLogout = () => {
    handleLogout(auth).then(() => {
      router.push('/');
    });
  };

  return (
    <aside
      onMouseLeave={() => {
        if (window.innerWidth >= 1024) {
          setIsCollapsed(true);
        }
      }}
      className={cn(
        "fixed inset-y-0 left-0 lg:static h-screen flex-shrink-0 bg-background flex flex-col transition-all duration-300 ease-in-out overflow-hidden z-50",
        isCollapsed
          ? "-translate-x-full lg:translate-x-0 lg:w-0 lg:border-r-0 lg:invisible"
          : "translate-x-0 w-64 border-r shadow-2xl lg:shadow-none"
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
        <nav className="px-2 space-y-1.5 py-4">
          {ADMIN_NAV_LINKS.map((link) => {
            if (link.href === '/') {
              return (
                <React.Fragment key={link.label}>
                  <Link href={link.href}>
                    <Button
                      variant="ghost"
                      className={cn("w-full justify-start gap-2", isCollapsed && "justify-center")}
                    >
                      <link.icon className="h-5 w-5" />
                      {!isCollapsed && link.label}
                    </Button>
                  </Link>
                  <Separator className="my-2" />
                </React.Fragment>
              );
            }

            // Has sub-items (e.g. Billing -> Active POS, Sales History, Audit Ledger)
            if (link.subItems && link.subItems.length > 0) {
              const isAnySubActive = link.subItems.some((sub) => pathname === sub.href);
              const isOpen = openGroups[link.label] ?? false;

              if (isCollapsed) {
                return (
                  <Link href={link.href} key={link.label}>
                    <Button
                      variant={isAnySubActive ? 'secondary' : 'ghost'}
                      className="w-full justify-center"
                      title={link.label}
                    >
                      <link.icon className="h-5 w-5" />
                    </Button>
                  </Link>
                );
              }

              return (
                <div key={link.label} className="space-y-1">
                  {/* Category Parent Button */}
                  <div className="flex items-center">
                    <Link href={link.href} className="flex-1">
                      <Button
                        variant={isAnySubActive ? 'secondary' : 'ghost'}
                        className={cn(
                          "w-full justify-start gap-2.5 font-semibold text-sm",
                          isAnySubActive && "text-orange-600 dark:text-orange-400 font-bold"
                        )}
                      >
                        <link.icon className="h-4 w-4" />
                        <span>{link.label}</span>
                      </Button>
                    </Link>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleGroup(link.label)}
                      className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
                      title={`Toggle ${link.label} sub-items`}
                    >
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  {/* Sub-items list */}
                  {isOpen && (
                    <div className="ml-4 pl-3 border-l-2 border-orange-200 dark:border-orange-900/50 space-y-1 my-1">
                      {link.subItems.map((sub) => {
                        const isSubActive = pathname === sub.href;
                        const SubIcon = sub.icon;

                        return (
                          <Link href={sub.href} key={sub.href}>
                            <Button
                              variant={isSubActive ? 'secondary' : 'ghost'}
                              size="sm"
                              className={cn(
                                "w-full justify-start gap-2 h-8 text-xs rounded-lg font-medium transition-colors",
                                isSubActive
                                  ? "bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400 font-bold border border-orange-200/60 dark:border-orange-800/60 shadow-2xs"
                                  : "text-muted-foreground hover:text-foreground"
                              )}
                            >
                              {SubIcon && <SubIcon className="h-3.5 w-3.5 shrink-0" />}
                              <span>{sub.label}</span>
                            </Button>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            // Standard link
            const isActive = link.href === '/admin' ? pathname === link.href : pathname.startsWith(link.href);

            return (
              <Link href={link.href} key={link.label}>
                <Button
                  variant={isActive ? 'secondary' : 'ghost'}
                  className={cn("w-full justify-start gap-2.5 text-sm", isCollapsed && "justify-center")}
                >
                  <link.icon className="h-4 w-4" />
                  {!isCollapsed && link.label}
                </Button>
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      <div className="p-2 border-t flex-shrink-0">
        <Button
          variant="ghost"
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
