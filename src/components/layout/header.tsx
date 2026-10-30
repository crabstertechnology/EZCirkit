'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, ShoppingCart, User, LogOut, LogIn, UserPlus, Shield, Search, Home, Zap, ShoppingBag, Package, Code, Star, Heart, ChevronRight, ChevronDown, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useScroll } from '@/hooks/use-scroll';
import CartSidebar from '@/components/layout/cart-sidebar';
import Logo from '@/components/shared/logo';
import { NAV_LINKS } from '@/lib/constants';
import { FEATURES } from '@/lib/features';
import { useCart } from '@/context/cart-context';
import { useUser, useDoc, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
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
import { doc, collection } from 'firebase/firestore';

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { scrolled } = useScroll();
  const { cartCount } = useCart();
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const firestore = useFirestore();
  const productsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'products') : null),
    [firestore]
  );
  const { data: storeProducts } = useCollection<any>(productsQuery);

  const realCategories = React.useMemo(() => {
    const fallbackList = [
      { name: 'Sensors', count: 12, href: '/products?category=Sensors' },
      { name: 'Components & ICs', count: 11, href: '/products?category=Components' },
      { name: 'Power Modules', count: 6, href: '/products?category=Power+Modules' },
      { name: 'Development Boards', count: 3, href: '/products?category=Development+Boards' },
      { name: 'Displays & OLEDs', count: 2, href: '/products?category=Displays' },
      { name: 'EZCirkit Learning Kit', count: 1, href: '/products?category=EZCirkit', badge: 'BESTSELLER' },
      { name: 'Wires & Connectors', count: 1, href: '/products?category=Wires+%26+Connectors' },
    ];

    if (!storeProducts || storeProducts.length === 0) {
      return fallbackList;
    }

    const catCounts: Record<string, { count: number; rawCat: string }> = {};
    storeProducts.forEach((p: any) => {
      let raw = p.category?.trim() || 'Components';
      if (raw === 'Electronic Components') raw = 'Components';
      if (!catCounts[raw]) {
        catCounts[raw] = { count: 0, rawCat: raw };
      }
      catCounts[raw].count += 1;
    });

    return Object.entries(catCounts)
      .sort((a, b) => b[1].count - a[1].count)
      .map(([name, info]) => {
        let displayName = name;
        if (name.toLowerCase() === 'components') displayName = 'Components & ICs';
        if (name.toLowerCase() === 'displays') displayName = 'Displays & OLEDs';
        if (name.toLowerCase() === 'ezcirkit') displayName = 'EZCirkit Learning Kit';
        return {
          name: displayName,
          count: info.count,
          href: `/products?category=${encodeURIComponent(info.rawCat)}`,
          badge: name.toLowerCase() === 'ezcirkit' ? 'BESTSELLER' : undefined,
        };
      });
  }, [storeProducts]);

  const [wishlistCount, setWishlistCount] = useState(0);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const userDocRef = useMemoFirebase(
    () => (!isUserLoading && user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user, isUserLoading]
  );
  const { data: userData } = useDoc<{ isAdmin?: boolean }>(userDocRef);
  const isAdmin = userData?.isAdmin ?? false;

  const settingsDocRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'settings', 'announcementBar') : null),
    [firestore]
  );
  const { data: rawSettings } = useDoc<any>(settingsDocRef);
  const announcementSettings = React.useMemo(() => {
    if (rawSettings === undefined) return undefined; // loading state
    if (rawSettings === null) {
      // document does not exist, use default fallback
      return {
        enabled: true,
        backgroundGradient: 'linear-gradient(90deg, #1c1917 0%, #292524 50%, #1c1917 100%)',
        textColor: '#ffffff',
        accentColor: '#f97316',
        speed: 40,
        items: [
          { prefixIcon: '⚡', text: 'Free Shipping Over ₹999', accentText: 'Free Shipping' },
          { prefixIcon: '', text: 'For Schools – Bulk Pricing', accentText: 'Bulk Pricing' },
          { prefixIcon: '', text: 'Made In India 🇮🇳', accentText: '' },
          { prefixIcon: '', text: '10,000+ Students Learning With EZCirkit', accentText: 'EZCirkit' },
          { prefixIcon: '', text: 'Step-by-Step Video Tutorials Included', accentText: 'Video Tutorials' }
        ]
      };
    }
    return {
      enabled: rawSettings.enabled ?? true,
      backgroundGradient: rawSettings.backgroundGradient || 'linear-gradient(90deg, #1c1917 0%, #292524 50%, #1c1917 100%)',
      textColor: rawSettings.textColor || '#ffffff',
      accentColor: rawSettings.accentColor || '#f97316',
      speed: rawSettings.speed ?? 40,
      items: rawSettings.items || []
    };
  }, [rawSettings]);

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
      case 'EZCirkit IDE':
      case 'Launch IDE':
      case 'Launch Ide': return <Code className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />;
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
            className="group text-sm lg:text-base xl:text-lg font-bold transition-all duration-200 relative text-foreground/80 hover:text-primary flex items-center gap-1.5 xl:gap-2 hover:scale-105 px-2 py-1.5 whitespace-nowrap"
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
    const [results, setResults] = useState<any[]>([]);
    const inputRef = React.useRef<HTMLInputElement>(null);
    const containerRef = React.useRef<HTMLDivElement>(null);
    const debounceRef = React.useRef<ReturnType<typeof setTimeout>>();

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

    // Live search against Firestore products
    React.useEffect(() => {
      clearTimeout(debounceRef.current);
      const q = searchQuery.trim().toLowerCase();
      if (!q) { setResults([]); return; }

      debounceRef.current = setTimeout(async () => {
        if (!firestore) return;
        try {
          const { collection: col, getDocs: gd, query: qry, orderBy: ob } = await import('firebase/firestore');
          const snap = await gd(qry(col(firestore, 'products'), ob('name')));
          const matched = snap.docs
            .map(d => ({ id: d.id, ...d.data() as any }))
            .filter((p: any) =>
              p.name?.toLowerCase().includes(q) ||
              p.category?.toLowerCase().includes(q) ||
              p.description?.toLowerCase().includes(q)
            )
            .slice(0, 6);
          setResults(matched);
        } catch (err) {
          console.error('Search error:', err);
        }
      }, 250);

      return () => clearTimeout(debounceRef.current);
    }, [searchQuery]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex(prev => (prev < results.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex(prev => (prev > 0 ? prev - 1 : results.length - 1));
      } else if (e.key === 'Enter') {
        const target = activeIndex >= 0 ? results[activeIndex] : results[0];
        if (target) handleSelect(target);
      } else if (e.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };

    const handleSelect = (product: any) => {
      setSearchQuery('');
      setIsOpen(false);
      setMobileMenuOpen(false);
      router.push(`/products/${product.id}`);
    };

    return (
      <div ref={containerRef} className="relative w-full">
        <div className="relative flex items-center w-full">
          {!isMobile && (
            <Search className="absolute left-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />
          )}
          <input
            ref={inputRef}
            type="text"
            placeholder={isMobile ? "Search For Components, Kits..." : "Search products..."}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsOpen(true);
              setActiveIndex(-1);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            className={cn(
              "w-full text-sm text-foreground placeholder:text-muted-foreground border focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all",
              isMobile
                ? "h-10 pl-3.5 pr-12 rounded-lg bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm"
                : "h-10 pl-10 pr-12 rounded-full bg-secondary/80 border-border"
            )}
          />
          {isMobile ? (
            <button
              type="button"
              onClick={() => {
                if (searchQuery.trim()) {
                  router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
                  setIsOpen(false);
                }
              }}
              className="absolute right-0 top-0 bottom-0 w-11 bg-primary hover:bg-primary/90 text-white rounded-r-lg flex items-center justify-center transition-colors shadow-sm"
              title="Search"
            >
              <Search className="h-4 w-4" />
            </button>
          ) : (
            <div className="absolute right-3.5 hidden lg:flex items-center gap-0.5 pointer-events-none select-none text-[10px] font-semibold text-muted-foreground bg-background px-1.5 py-0.5 rounded border shadow-sm">
              <span className="text-[11px]">⌘</span>K
            </div>
          )}
        </div>

        {isOpen && searchQuery.trim() !== '' && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-background border border-border rounded-xl shadow-xl z-50 overflow-hidden max-h-[360px] overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150">
            {results.length > 0 ? (
              <div className="p-1">
                {results.map((product, index) => {
                  const isActive = index === activeIndex;
                  const discount = product.originalPrice && product.originalPrice > product.price
                    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
                    : null;
                  return (
                    <button
                      key={product.id}
                      onClick={() => handleSelect(product)}
                      className={cn(
                        'w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 transition-colors',
                        isActive ? 'bg-primary/10' : 'hover:bg-muted'
                      )}
                    >
                      {/* Thumbnail */}
                      <div className="w-10 h-10 rounded-lg border border-border bg-zinc-50 flex-shrink-0 overflow-hidden">
                        <img
                          src={product.image || '/logo.png'}
                          alt={product.name}
                          className="w-full h-full object-contain p-0.5"
                          onError={(e) => { (e.target as HTMLImageElement).src = '/logo.png'; }}
                        />
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className={cn('text-sm font-semibold truncate', isActive ? 'text-primary' : 'text-foreground')}>
                          {product.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          ₹{product.price?.toLocaleString('en-IN')}
                          {product.originalPrice && product.originalPrice > product.price && (
                            <span className="ml-1.5 line-through text-zinc-400">₹{product.originalPrice?.toLocaleString('en-IN')}</span>
                          )}
                        </p>
                      </div>
                      {/* Discount badge */}
                      {!!discount && discount > 0 && (
                        <span className="text-[10px] font-black bg-[#ff6c00] text-white px-1.5 py-0.5 rounded-sm flex-shrink-0">
                          -{discount}%
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 text-center text-sm text-muted-foreground">
                No products found for "{searchQuery}"
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const MobileMenu = () => {
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
      categories: true, // open categories by default
    });

    const toggleSection = (section: string) => {
      setExpandedSections((prev) => ({
        ...prev,
        [section]: !prev[section],
      }));
    };

    return (
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-[300px] sm:w-[360px] p-0 flex flex-col bg-white dark:bg-zinc-950 border-r border-border shadow-2xl">
          <SheetHeader className="px-5 py-4 border-b border-border/80 text-left bg-zinc-50/70 dark:bg-zinc-900/50 flex-shrink-0">
            <SheetTitle className="font-headline font-black text-xl tracking-tight text-foreground">Menu</SheetTitle>
          </SheetHeader>

          {/* Quick Search inside menu */}
          <div className="p-3 border-b border-zinc-100 dark:border-zinc-800 flex-shrink-0">
            <SearchBar isMobile={true} />
          </div>

          {/* Scrollable Categories List */}
          <ScrollArea className="flex-1 overflow-y-auto">
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800 text-sm font-semibold text-foreground">
              {/* 1. Shop By Category (Only What We Actually Have) */}
              <div>
                <button
                  type="button"
                  onClick={() => toggleSection('categories')}
                  className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors text-left cursor-pointer"
                >
                  <span className="text-sm font-bold text-foreground">Shop By Category</span>
                  <ChevronRight
                    className={cn(
                      "h-4 w-4 text-zinc-400 transition-transform duration-200",
                      expandedSections.categories && "rotate-90 text-orange-500"
                    )}
                  />
                </button>
                {expandedSections.categories && (
                  <div className="bg-zinc-50/80 dark:bg-zinc-900/40 px-5 py-1.5 space-y-0.5 border-t border-zinc-100 dark:border-zinc-800 text-xs">
                    <Link
                      href="/products"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-between py-2 text-zinc-600 dark:text-zinc-300 hover:text-orange-600 font-semibold"
                    >
                      <span>All Products</span>
                      <span className="text-[10px] text-muted-foreground bg-zinc-200/60 dark:bg-zinc-800 px-1.5 py-0.5 rounded-full font-bold">
                        {storeProducts?.length || 36}
                      </span>
                    </Link>
                    {realCategories.map((cat) => (
                      <Link
                        key={cat.name}
                        href={cat.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center justify-between py-2 text-zinc-600 dark:text-zinc-300 hover:text-orange-600"
                      >
                        <span className="truncate">{cat.name}</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {cat.badge && (
                            <Badge className="bg-orange-500 text-white text-[9px] px-1 py-0 h-4">{cat.badge}</Badge>
                          )}
                          <span className="text-[10px] text-muted-foreground bg-zinc-200/60 dark:bg-zinc-800 px-1.5 py-0.5 rounded-full font-semibold">
                            {cat.count}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* 2. Account Section */}

              <div className="pt-2">
                {user ? (
                  <div className="space-y-1">
                    <div className="px-5 py-2.5 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900">
                      <div className="flex items-center gap-2.5">
                        <User className="h-4 w-4 text-zinc-500" />
                        <span className="text-xs font-bold text-foreground truncate max-w-[150px]">
                          {user.displayName || user.email?.split('@')[0]}
                        </span>
                      </div>
                      {isAdmin && (
                        <Link
                          href="/admin"
                          onClick={() => setMobileMenuOpen(false)}
                          className="text-[11px] font-bold text-orange-600 hover:underline"
                        >
                          Admin Panel
                        </Link>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        handleLogout(auth);
                      }}
                      className="w-full flex items-center px-5 py-3 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 text-xs font-semibold cursor-pointer"
                    >
                      <LogOut className="h-4 w-4 mr-3" />
                      <span>Log out</span>
                    </button>
                  </div>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full flex items-center px-5 py-3.5 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors"
                  >
                    <User className="h-4 w-4 mr-3 text-zinc-500" />
                    <span className="text-sm font-bold text-foreground">Log out / My Account</span>
                  </Link>
                )}
              </div>

              {/* 3. My Wish List */}
              <div>
                <Link
                  href="/wishlist"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors"
                >
                  <div className="flex items-center">
                    <Heart className="h-4 w-4 mr-3 text-zinc-500 hover:text-red-500" />
                    <span className="text-sm font-bold text-foreground">My Wish List</span>
                  </div>
                  {wishlistCount > 0 && (
                    <Badge className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0 h-4 rounded-full">
                      {wishlistCount}
                    </Badge>
                  )}
                </Link>
              </div>

              {/* 4. My Shopping Cart */}
              <div>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setIsCartOpen(true);
                  }}
                  className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors text-left cursor-pointer"
                >
                  <div className="flex items-center">
                    <ShoppingCart className="h-4 w-4 mr-3 text-zinc-500" />
                    <span className="text-sm font-bold text-foreground">My Shopping Cart</span>
                  </div>
                  {cartCount > 0 && (
                    <Badge className="bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0 h-4 rounded-full">
                      {cartCount}
                    </Badge>
                  )}
                </button>
              </div>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    );
  };

  return (
    <header
      suppressHydrationWarning
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        scrolled
          ? 'shadow-header bg-background/95 backdrop-blur-md border-b border-border/40'
          : 'bg-background/95 md:bg-transparent backdrop-blur-md md:backdrop-blur-none border-b border-border/40 md:border-b-0'
      )}
    >
      <div className="container mx-auto flex flex-col px-3 sm:px-4 md:px-6">
        {/* ========================================================= */}
        {/* MOBILE VIEW (< md): 2-Row Layout matching robocraze */}
        {/* ========================================================= */}
        <div className="md:hidden flex flex-col w-full">
          {/* Row 1: Left [Menu ☰] | Center [Crabster Logo] | Right [Cart] [Wishlist] [Profile] */}
          <div className="flex h-14 items-center justify-between w-full">
            {/* Left: Mobile Sidebar Toggle */}
            <div className="w-[104px] flex items-center justify-start shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-foreground cursor-pointer"
                onClick={() => setMobileMenuOpen(true)}
                title="Open Menu & Categories"
              >
                <Menu className="h-5 w-5 sm:h-6 sm:w-6" />
                <span className="sr-only">Open Menu</span>
              </Button>
            </div>

            {/* Center: Brand Logo (Visually & Mathematically Dead-Centered) */}
            <div className="flex-1 flex items-center justify-center min-w-0">
              <Logo size="sm" />
            </div>

            {/* Right: Cart, Wishlist, User Avatar */}
            <div className="w-[104px] flex items-center gap-1 justify-end shrink-0">
              {/* Shopping Cart Sidebar Button */}
              <Button
                variant="ghost"
                size="icon"
                className="relative h-8 w-8 p-0"
                onClick={() => setIsCartOpen(true)}
              >
                <ShoppingCart className="h-4.5 w-4.5" />
                {cartCount > 0 && (
                  <Badge
                    variant="default"
                    className="absolute -top-1 -right-1 h-4 w-4 justify-center rounded-full bg-red-500 p-0 text-[10px] font-bold text-white"
                  >
                    {cartCount}
                  </Badge>
                )}
                <span className="sr-only">Open Cart</span>
              </Button>

              {/* Wishlist Link Button */}
              <Button asChild variant="ghost" size="icon" className="relative h-8 w-8 p-0">
                <Link href="/wishlist">
                  <Heart className="h-4.5 w-4.5 text-muted-foreground hover:text-red-500 transition-colors" />
                  {wishlistCount > 0 && (
                    <Badge
                      variant="default"
                      className="absolute -top-1 -right-1 h-4 w-4 justify-center rounded-full bg-red-500 p-0 text-[10px] font-bold text-white"
                    >
                      {wishlistCount}
                    </Badge>
                  )}
                  <span className="sr-only">Open Wishlist</span>
                </Link>
              </Button>

              {/* Profile Avatar / Login */}
              <AuthNav />
            </div>
          </div>

          {/* Row 2: Mobile Search Bar Row (Full width with attached search button) */}
          <div className="w-full pb-2 px-0.5">
            <SearchBar isMobile={true} />
          </div>
        </div>

        {/* ========================================================= */}
        {/* DESKTOP VIEW (>= md): 1-Row Centered Layout */}
        {/* ========================================================= */}
        <div suppressHydrationWarning className="hidden md:flex h-20 items-center justify-between gap-4 w-full">
          {/* Desktop Left: Brand Logo & Products Link */}
          <div className="flex items-center gap-5 xl:gap-8 shrink-0 min-w-0">
            <Logo size="lg" />
            <nav className="flex items-center">
              <NavLinks items={[{ href: '/products', label: 'Products' }]} />
            </nav>
          </div>
          
          {/* Desktop Center: SearchBar (Dead Center) */}
          <div className="flex justify-center flex-1 max-w-[320px] lg:max-w-[440px] xl:max-w-[540px] mx-auto">
            <SearchBar />
          </div>

          {/* Desktop Right: Launch IDE, Cart, Wishlist & Actions */}
          <div className="flex items-center gap-2 lg:gap-3 shrink-0 justify-end min-w-0">
            {/* Launch IDE moved to right */}
            <nav className="flex items-center">
              <NavLinks items={[{ href: '/ide', label: 'Launch IDE' }]} />
            </nav>

            {/* Shopping Cart Button */}
            <Button variant="ghost" size="icon" className="relative h-10 w-10" onClick={() => setIsCartOpen(true)}>
              <ShoppingCart className="h-6 w-6" />
              {cartCount > 0 && (
                <Badge
                  variant="default"
                  className="absolute -top-1 -right-1 h-5 w-5 justify-center rounded-full bg-red-500 p-0 text-xs text-white"
                >
                  {cartCount}
                </Badge>
              )}
              <span className="sr-only">Open Cart</span>
            </Button>

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

            <AuthNav />
          </div>
        </div>
      </div>

      {/* Announcement Bar — positioned below the header */}
      {mounted && pathname === '/' && announcementSettings && announcementSettings.enabled && announcementSettings.items.length > 0 && (
        <div 
          className="w-full overflow-hidden relative" 
          style={{ 
            background: announcementSettings.backgroundGradient, 
            borderTop: '1px solid rgba(255,255,255,0.1)',
            borderBottom: '1px solid rgba(255,255,255,0.1)' 
          }}
        >
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes marquee {
              0% { transform: translate3d(0, 0, 0); }
              100% { transform: translate3d(-50%, 0, 0); }
            }
            .animate-marquee {
              display: inline-flex;
              white-space: nowrap;
              animation: marquee ${announcementSettings.speed}s linear infinite;
            }
            .marquee-dot {
              color: ${announcementSettings.accentColor};
              font-size: 14px;
              line-height: 1;
            }
            .marquee-item {
              color: ${announcementSettings.textColor};
              font-size: 9px;
              font-weight: 800;
              letter-spacing: 0.12em;
              text-transform: uppercase;
            }
            .marquee-accent {
              color: ${announcementSettings.accentColor};
              font-weight: 900;
            }
          `}} />
          <div className="flex animate-marquee items-center py-1.5" style={{ gap: '2.5rem' }}>
            {[0, 1].map((copy) => (
              <div key={copy} className="flex items-center shrink-0" style={{ gap: '2.5rem' }}>
                {announcementSettings.items.map((item: any, idx: number) => {
                  const parts = item.text.split(new RegExp(`(${item.accentText})`, 'gi'));
                  return (
                    <React.Fragment key={idx}>
                      <span className="marquee-item">
                        {item.prefixIcon && <span className="mr-1.5">{item.prefixIcon}</span>}
                        <span>
                          {parts.map((part: string, i: number) => {
                            const isAccent = item.accentText && part.toLowerCase() === item.accentText.toLowerCase();
                            return (
                              <span key={i} className={isAccent ? 'marquee-accent' : undefined}>
                                {part}
                              </span>
                            );
                          })}
                        </span>
                      </span>
                      <span className="marquee-dot">◆</span>
                    </React.Fragment>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cart Sidebar */}
      <MobileMenu />
      <CartSidebar isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </header>
  );
};

export default Header;
