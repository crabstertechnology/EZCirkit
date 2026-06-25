'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Menu, ShoppingCart, User, LogOut, LogIn, UserPlus, Shield, Search, Home, Zap, ShoppingBag, Package, Code, Star, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useScroll } from '@/hooks/use-scroll';
import CartSidebar from '@/components/layout/cart-sidebar';
import Logo from '@/components/shared/logo';
import { NAV_LINKS } from '@/lib/constants';
import { FEATURES } from '@/lib/features';
import { COMPONENTS_DATA } from '@/lib/components';
import { useCart } from '@/context/cart-context';
import { useUser, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { handleLogout } from '@/lib/auth';
import { useAuth } from '@/firebase';
import { useRouter, usePathname } from 'next/navigation';
import { doc } from 'firebase/firestore';

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { scrolled } = useScroll();
  const { cartCount } = useCart();
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const firestore = useFirestore();
  const [wishlistCount, setWishlistCount] = useState(0);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const userDocRef = useMemoFirebase(
    () => (!isUserLoading && user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user, isUserLoading]
  );
  const { data: userData } = useDoc<{ isAdmin?: boolean }>(userDocRef);
  const isAdmin = userData?.isAdmin ?? false;

  // Sync wishlist count from localStorage
  const updateWishlistCount = () => {
    try {
      const saved = localStorage.getItem('wishlist');
      if (saved) {
        setWishlistCount(JSON.parse(saved).length);
      } else {
        setWishlistCount(0);
      }
    } catch (e) {
      setWishlistCount(0);
    }
  };

  React.useEffect(() => {
    updateWishlistCount();
    window.addEventListener('wishlist-updated', updateWishlistCount);
    window.addEventListener('storage', updateWishlistCount);
    return () => {
      window.removeEventListener('wishlist-updated', updateWishlistCount);
      window.removeEventListener('storage', updateWishlistCount);
    };
  }, []);

  // Watch session storage to highlight items navigated from other pages
  React.useEffect(() => {
    const highlightTarget = sessionStorage.getItem('highlight-target');
    if (highlightTarget) {
      sessionStorage.removeItem('highlight-target');
      // Wait for page load/mounting to stabilize
      setTimeout(() => {
        const element = document.getElementById(highlightTarget);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('animate-card-highlight');
          if (pathname === '/products') {
            (element as HTMLElement).click();
          }
          setTimeout(() => {
            element.classList.remove('animate-card-highlight');
          }, 3000);
        }
      }, 500);
    }
  }, [pathname]);

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length > 1) {
      return names[0][0] + names[names.length - 1][0];
    }
    return name.substring(0, 2);
  };
  
  const doLogout = () => {
    handleLogout(auth).then(() => {
      router.push('/');
    });
  }

  const AuthNav = () => {
    if (isUserLoading) {
      return <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />;
    }
    if (user) {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger className="relative h-8 w-8 rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.photoURL ?? ''} alt={user.displayName ?? 'User'} />
              <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user.displayName}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/profile')}>
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
            </DropdownMenuItem>
             {isAdmin && (
               <DropdownMenuItem onClick={() => router.push('/admin')}>
                <Shield className="mr-2 h-4 w-4" />
                <span>Admin Panel</span>
            </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={doLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }
    return (
      <div className="hidden md:flex items-center gap-2">
        <Button asChild variant="ghost" size="sm" key="login">
          <Link href="/login">
            <LogIn className="mr-2 h-4 w-4" />
            Login
          </Link>
        </Button>
        <Button asChild size="sm" key="signup">
          <Link href="/signup">
            <UserPlus className="mr-2 h-4 w-4" />
            Sign Up
          </Link>
        </Button>
      </div>
    );
  };

  const getLinkIcon = (label: string) => {
    switch (label) {
      case 'Home': return <Home className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors animate-in" />;
      case 'Features': return <Zap className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />;
      case 'Products': return <ShoppingBag className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />;
      case 'Projects': return <Package className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />;
      case 'KIT': return <Package className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />;
      case 'EZCirkit IDE': return <Code className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />;
      case 'Reviews': return <Star className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />;
      default: return null;
    }
  };

  const NavLinks = ({ items }: { items?: typeof NAV_LINKS }) => {
    const displayLinks = items || NAV_LINKS;
    const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
      setMobileMenuOpen(false);
      
      const isSamePage = pathname === href || (pathname === '/' && href === '/');
      const isHashLink = href.startsWith('/#') || href.includes('#');
      
      if (isHashLink) {
        const targetId = href.split('#')[1];
        if (isSamePage) {
          e.preventDefault();
          const element = document.getElementById(targetId);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.classList.add('animate-card-highlight');
            setTimeout(() => {
              element.classList.remove('animate-card-highlight');
            }, 3000);
          }
        } else {
          sessionStorage.setItem('highlight-target', targetId);
        }
      } else if (href === '/products' && pathname === '/products') {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (!href.includes('#')) {
        e.preventDefault();
        router.push(href);
      }
    };

    return (
      <>
        {displayLinks.map((link) => (
          <Link
            key={`${link.label}-${link.href}`}
            href={link.href}
            className="group text-base lg:text-lg xl:text-xl font-bold transition-all duration-200 relative text-foreground/80 hover:text-primary flex items-center gap-1.5 xl:gap-2 hover:scale-105 px-2 py-1.5 whitespace-nowrap"
            onClick={(e) => handleLinkClick(e, link.href)}
          >
            {getLinkIcon(link.label)}
            <span>{link.label}</span>
          </Link>
        ))}
      </>
    );
  };

  const SearchBar = ({ isMobile = false }: { isMobile?: boolean }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const inputRef = React.useRef<HTMLInputElement>(null);
    const containerRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setIsOpen(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    React.useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
          e.preventDefault();
          inputRef.current?.focus();
          setIsOpen(true);
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const searchItems = [
      {
        type: 'page' as const,
        title: 'EZCirkit IDE',
        description: 'Browser-based Arduino code editor and uploader.',
        href: '/ide'
      },
      {
        type: 'page' as const,
        title: 'Products / Components Explorer',
        description: 'Explore individual components included in the EZCirkit kit.',
        href: '/products'
      },
      {
        type: 'section' as const,
        title: 'EZCirkit Compatible Kit',
        description: 'Order the complete starter kit with 20+ components.',
        targetId: 'products',
        href: '/#products'
      },
      {
        type: 'section' as const,
        title: 'User Reviews & Ratings',
        description: 'Read reviews and average ratings from other students.',
        targetId: 'testimonials',
        href: '/#testimonials'
      },
      {
        type: 'section' as const,
        title: 'Download Brochure',
        description: 'Get the detailed 4-page educational starter kit PDF.',
        targetId: 'brochure',
        href: '/#brochure'
      },
      ...FEATURES.map((feat, index) => ({
        type: 'feature' as const,
        title: feat.title,
        description: feat.description,
        targetId: 'brochure',
        href: '/#brochure'
      })),
      ...COMPONENTS_DATA.map((comp) => ({
        type: 'product' as const,
        title: comp.name,
        description: comp.description,
        targetId: comp.id,
        href: `/products`
      }))
    ];

    const filtered = searchQuery.trim() === ''
      ? []
      : searchItems.filter(item =>
          item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.description.toLowerCase().includes(searchQuery.toLowerCase())
        );

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex(prev => (prev < filtered.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex(prev => (prev > 0 ? prev - 1 : filtered.length - 1));
      } else if (e.key === 'Enter') {
        if (activeIndex >= 0 && filtered[activeIndex]) {
          handleSearchItemClick(filtered[activeIndex]);
        } else if (filtered.length > 0) {
          handleSearchItemClick(filtered[0]);
        }
      } else if (e.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };

    const handleSearchItemClick = (item: typeof searchItems[0]) => {
      setSearchQuery('');
      setIsOpen(false);
      setMobileMenuOpen(false);

      if (item.href) {
        const isSamePage = pathname === item.href || (pathname === '/' && item.href === '/');
        const isHashLink = item.href.includes('#') || item.targetId;

        if (isHashLink && isSamePage && item.targetId) {
          const element = document.getElementById(item.targetId);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.classList.add('animate-card-highlight');
            if (pathname === '/products') {
              (element as HTMLElement).click();
            }
            setTimeout(() => {
              element.classList.remove('animate-card-highlight');
            }, 3000);
          }
        } else {
          if (item.targetId) {
            sessionStorage.setItem('highlight-target', item.targetId);
          }
          router.push(item.href);
        }
      }
    };

    return (
      <div ref={containerRef} className="relative w-full">
        <div className="relative flex items-center">
          <Search className="absolute left-3.5 h-5 w-5 text-muted-foreground pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search features, pages, components..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsOpen(true);
              setActiveIndex(-1);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            className="w-full bg-secondary/80 text-base pl-11 pr-12 py-2.5 rounded-full border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200"
          />
          {!isMobile && (
            <div className="absolute right-3.5 hidden lg:flex items-center gap-0.5 pointer-events-none select-none text-[10px] font-semibold text-muted-foreground bg-background px-1.5 py-0.5 rounded border shadow-sm">
              <span className="text-[11px]">⌘</span>K
            </div>
          )}
        </div>

        {isOpen && searchQuery.trim() !== '' && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-background border border-border rounded-xl shadow-xl z-50 overflow-hidden max-h-[320px] overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150">
            {filtered.length > 0 ? (
              <div className="p-1">
                {filtered.map((item, index) => {
                  const isActive = index === activeIndex;
                  return (
                    <button
                      key={index}
                      onClick={() => handleSearchItemClick(item)}
                      className={cn(
                        "w-full text-left px-3 py-2.5 rounded-lg flex flex-col transition-colors",
                        isActive ? "bg-primary/10" : "hover:bg-muted text-foreground"
                      )}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className={cn("font-semibold text-sm", isActive ? "text-primary font-bold" : "text-foreground")}>
                          {item.title}
                        </span>
                        <span className={cn(
                          "text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider",
                          item.type === 'feature' ? "bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-300" :
                          item.type === 'product' ? "bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-300" :
                          item.type === 'page' ? "bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-300" :
                          "bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-300"
                        )}>
                          {item.type}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{item.description}</p>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 text-center text-sm text-muted-foreground">
                No results found for "{searchQuery}"
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const MobileMenu = () => {
    return (
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon">
            <Menu className="h-6 w-6" />
            <span className="sr-only">Open Menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-[300px] sm:w-[400px]">
           <SheetHeader>
            <SheetTitle className="sr-only">Mobile Menu</SheetTitle>
           </SheetHeader>
          <div className="p-4 space-y-6">
            <div className="mb-2">
              <Logo size="lg" />
            </div>
            
            <SearchBar isMobile={true} />
            
            <nav className="flex flex-col items-start gap-4 pt-4 border-t">
              <NavLinks />
               {!user && (
                  <>
                    <Link href="/login" className="text-sm font-medium text-foreground/80 transition-colors hover:text-foreground pl-3.5 py-1.5" onClick={() => setMobileMenuOpen(false)}>Login</Link>
                    <Link href="/signup" className="text-sm font-medium text-foreground/80 transition-colors hover:text-foreground pl-3.5 py-1.5" onClick={() => setMobileMenuOpen(false)}>Sign Up</Link>
                  </>
                )}
            </nav>
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <header
      suppressHydrationWarning
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        scrolled ? 'shadow-header bg-background/90 backdrop-blur-sm' : 'bg-transparent'
      )}
    >
      <div className="container mx-auto flex flex-col px-4 md:px-6">
        {/* Row 1: Brand & Navigation Links & Actions */}
        <div suppressHydrationWarning className="flex h-20 items-center justify-between gap-4 w-full">
          {/* Logo (Far Left) */}
          <div className="flex-shrink-0">
            <Logo size="lg" />
          </div>

          {/* Left Nav Links (Home, Products) */}
          <nav className="hidden lg:flex flex-1 justify-end items-center gap-2 xl:gap-4 pr-4">
            <NavLinks items={NAV_LINKS.slice(0, 2)} />
          </nav>
          
          {/* Center SearchBar */}
          <div className="hidden md:flex justify-center w-full max-w-[250px] lg:max-w-[320px] xl:max-w-[420px]">
            <SearchBar />
          </div>

          {/* Right Nav Links (EZCirkit IDE, Reviews) */}
          <nav className="hidden lg:flex flex-1 justify-start items-center gap-2 xl:gap-4 pl-4">
            <NavLinks items={NAV_LINKS.slice(2, 4)} />
          </nav>

          {/* Action Buttons (Far Right) */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Wishlist Link Button */}
            <Button asChild variant="ghost" size="icon" className="relative h-10 w-10">
              <Link href="/wishlist">
                <Heart className="h-6 w-6 text-muted-foreground hover:text-red-500 transition-colors" />
                {wishlistCount > 0 && (
                  <Badge
                    variant="default"
                    className="absolute -top-1 -right-1 h-5 w-5 justify-center rounded-full bg-red-500 p-0 text-xs text-white"
                  >
                    {wishlistCount}
                  </Badge>
                )}
                <span className="sr-only">Open Wishlist</span>
              </Link>
            </Button>

            {/* Shopping Cart Sidebar Button */}
            <Button variant="ghost" size="icon" className="relative h-10 w-10" onClick={() => setIsCartOpen(true)}>
              <ShoppingCart className="h-6 w-6" />
              {cartCount > 0 && (
                <Badge
                  variant="default"
                  className="absolute -top-1 -right-1 h-5 w-5 justify-center rounded-full bg-primary p-0 text-xs text-white"
                >
                  {cartCount}
                </Badge>
              )}
              <span className="sr-only">Open Cart</span>
            </Button>

            <AuthNav />
            
            <div className="md:hidden">
              <MobileMenu />
            </div>
          </div>
        </div>
      </div>

      {/* Cart Sidebar */}
      <CartSidebar isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />

      {/* Announcement Bar */}
      {pathname === '/' && (
        <div className="w-full overflow-hidden relative" style={{ background: 'linear-gradient(90deg, #1c1917 0%, #292524 50%, #1c1917 100%)', borderTop: '1px solid #44403c' }}>
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes marquee {
              0% { transform: translate3d(0, 0, 0); }
              100% { transform: translate3d(-50%, 0, 0); }
            }
            .animate-marquee {
              display: inline-flex;
              white-space: nowrap;
              animation: marquee 40s linear infinite;
            }
            .marquee-dot {
              color: #f97316;
              font-size: 14px;
              line-height: 1;
            }
            .marquee-item {
              color: #ffffff;
              font-size: 9px;
              font-weight: 800;
              letter-spacing: 0.12em;
              text-transform: uppercase;
            }
            .marquee-accent {
              color: #f97316;
              font-weight: 900;
            }
          `}} />
          <div className="flex animate-marquee items-center py-1.5" style={{ gap: '2.5rem' }}>
            {[0, 1].map((copy) => (
              <div key={copy} className="flex items-center shrink-0" style={{ gap: '2.5rem' }}>
                <span className="marquee-item">⚡ <span className="marquee-accent">Free Shipping</span> Over ₹999</span>
                <span className="marquee-dot">◆</span>
                <span className="marquee-item">For Schools – <span className="marquee-accent">Bulk Pricing</span></span>
                <span className="marquee-dot">◆</span>
                <span className="marquee-item">Made In India 🇮🇳</span>
                <span className="marquee-dot">◆</span>
                <span className="marquee-item">10,000+ Students Learning With <span className="marquee-accent">EZCirkit</span></span>
                <span className="marquee-dot">◆</span>
                <span className="marquee-item">Step-by-Step <span className="marquee-accent">Video Tutorials</span> Included</span>
                <span className="marquee-dot">◆</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
