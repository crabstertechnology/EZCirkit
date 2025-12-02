
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Menu, ShoppingCart, User, LogOut, LogIn, UserPlus, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useScroll } from '@/hooks/use-scroll';
import Logo from '@/components/shared/logo';
import { NAV_LINKS } from '@/lib/constants';
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
import { useRouter } from 'next/navigation';
import { doc } from 'firebase/firestore';

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { scrolled } = useScroll();
  const { cartCount } = useCart();
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(
    () => (!isUserLoading && user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user, isUserLoading]
  );
  const { data: userData } = useDoc<{ isAdmin?: boolean }>(userDocRef);
  const isAdmin = userData?.isAdmin ?? false;

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
      return null;
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

  const NavLinks = () => (
    <>
      {NAV_LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="text-sm font-medium text-foreground/80 transition-colors hover:text-foreground"
          onClick={() => setMobileMenuOpen(false)}
        >
          {link.label}
        </Link>
      ))}
    </>
  );

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
          <div className="p-4">
            <div className="mb-8">
              <Logo />
            </div>
            <nav className="flex flex-col items-start gap-6">
              <NavLinks />
               {!user && (
                  <>
                    <Link href="/login" className="text-sm font-medium text-foreground/80 transition-colors hover:text-foreground" onClick={() => setMobileMenuOpen(false)}>Login</Link>
                    <Link href="/signup" className="text-sm font-medium text-foreground/80 transition-colors hover:text-foreground" onClick={() => setMobileMenuOpen(false)}>Sign Up</Link>
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
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        scrolled ? 'shadow-header bg-background/80 backdrop-blur-sm' : 'bg-transparent'
      )}
    >
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <Logo />

        <nav className="hidden items-center gap-6 md:flex">
          <NavLinks />
        </nav>

        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="icon" className="relative">
            <Link href="/cart">
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && (
                <Badge
                  variant="default"
                  className="absolute -top-1 -right-1 h-5 w-5 justify-center rounded-full bg-primary-gradient p-0 text-xs text-primary-foreground"
                >
                  {cartCount}
                </Badge>
              )}
              <span className="sr-only">Open Cart</span>
            </Link>
          </Button>

          <AuthNav />
          
          <div className="md:hidden">
            <MobileMenu />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
