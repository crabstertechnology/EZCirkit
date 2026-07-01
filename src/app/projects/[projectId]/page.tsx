'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { Clock, ChevronRight, CheckCircle, FileText, ShoppingCart, HelpCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useCart } from '@/context/cart-context';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, limit } from 'firebase/firestore';
import { PROJECTS_DATA } from '@/lib/projects';
import { cn } from '@/lib/utils';

const PRODUCT_ID = 'pro1';

interface Product {
  id: string; 
  name: string;
  price: number;
  originalPrice: number;
  image: string;
  description: string;
  stock: number;
}

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { addToCart } = useCart();
  const firestore = useFirestore();

  const projectId = params?.projectId as string;
  const project = PROJECTS_DATA.find((p) => p.id === projectId);

  // Fetch the Starter Kit product from DB for the "Get the Kit" button
  const productsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'products'), where('id', '==', PRODUCT_ID), limit(1)) : null),
    [firestore]
  );
  const { data: products } = useCollection<Product>(productsQuery);
  const kitProduct = products?.[0];

  const handleGetKit = async () => {
    if (kitProduct) {
      if (kitProduct.stock <= 0) {
        toast({
          title: "Out of Stock",
          description: "The EZCirkit Starter Kit is currently out of stock.",
          variant: "destructive"
        });
        return;
      }
      await addToCart(kitProduct);
      toast({
        title: "Kit Added to Cart",
        description: "EZCirkit Starter Kit has been added. Redirecting to checkout...",
      });
      router.push('/checkout');
    } else {
      // Fallback in case DB is offline/loading
      addToCart({
        id: PRODUCT_ID,
        name: 'EZCirkit Starter Kit',
        price: 2499,
        image: '/kit/new-kit-front.png',
        description: 'The single kit you need to build your first 10 electronics projects.'
      });
      router.push('/checkout');
    }
  };

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center space-y-4 pt-24">
        <h1 className="text-2xl font-bold">Project not found</h1>
        <p className="text-muted-foreground">The project ID you are trying to view does not exist.</p>
        <Button asChild>
          <Link href="/projects">Back to Projects</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50/50 dark:bg-zinc-950 text-foreground pt-28 md:pt-40 pb-16">
      <div className="container mx-auto px-4 md:px-6 max-w-5xl space-y-8">
        
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-1.5 text-xs md:text-sm font-semibold text-muted-foreground">
          <Link href="/" className="hover:text-primary transition-colors">Home</Link>
          <ChevronRight className="h-4 w-4 shrink-0 text-zinc-400" />
          <Link href="/projects" className="hover:text-primary transition-colors">Projects</Link>
          <ChevronRight className="h-4 w-4 shrink-0 text-zinc-400" />
          <span className="text-foreground font-bold line-clamp-1">{project.title}</span>
        </nav>

        {/* Title Block Header */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Badge
              className={cn(
                "text-[9px] font-black uppercase tracking-wider py-0.5 px-2 border-none",
                project.difficulty === 'Beginner'
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : project.difficulty === 'Intermediate'
                  ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                  : "bg-purple-500/10 text-purple-600 dark:text-purple-400"
              )}
            >
              {project.difficulty}
            </Badge>
            <div className="flex items-center gap-1 text-xs font-bold text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>{project.duration}</span>
            </div>
          </div>
          
          <h1 className="text-3xl md:text-5xl font-black font-headline text-foreground leading-tight">
            {project.title}
          </h1>
          <p className="text-muted-foreground text-sm md:text-base max-w-2xl leading-relaxed">
            {project.description}
          </p>
        </div>

        {/* main Layout Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Image, Wiring instructions */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Project Image Frame */}
            <div className="aspect-[16/10] w-full relative rounded-3xl overflow-hidden border border-border/80 shadow-md bg-zinc-100">
              <Image
                src={project.image}
                alt={project.title}
                fill
                priority
                className="object-cover"
              />
            </div>

            {/* Wiring Instructions Card */}
            <div className="bg-background border border-border p-6 rounded-3xl space-y-6 shadow-sm">
              <h3 className="text-lg font-black font-headline text-foreground">
                Wiring Instructions
              </h3>
              <div className="space-y-4">
                {project.wiringInstructions.map((instruction, index) => (
                  <div key={index} className="flex gap-4 items-start">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">
                      {index + 1}
                    </span>
                    <p className="text-muted-foreground text-sm leading-relaxed pt-0.5">
                      {instruction}
                    </p>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Right Column: Components list, Action CTAs, Pro Tip */}
          <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-28">
            
            {/* Parts Required Card */}
            <div className="bg-background border border-border/80 p-6 rounded-3xl space-y-5 shadow-sm">
              <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                Components Required
              </h3>
              
              <div className="space-y-3">
                {project.components.map((component, idx) => (
                  <div key={idx} className="flex items-start gap-2.5">
                    <CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span className="text-xs md:text-sm font-semibold text-foreground/80">{component}</span>
                  </div>
                ))}
              </div>

              <hr className="border-border/60" />

              {/* Action Buttons */}
              <div className="space-y-3 pt-1">
                <Button
                  onClick={handleGetKit}
                  className="w-full bg-primary text-white font-extrabold shadow-md hover:bg-primary/95 transition-all rounded-xl h-11 text-xs md:text-sm uppercase tracking-wider"
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Get the Kit
                </Button>
              </div>
            </div>

            {/* Pro Tip Card */}
            <div className="bg-amber-50 dark:bg-amber-950/10 border border-amber-200/80 dark:border-amber-900/30 p-6 rounded-3xl space-y-3 relative overflow-hidden">
              <div className="absolute top-0 right-0 h-20 w-20 bg-amber-400/5 rounded-full blur-xl"></div>
              
              <Badge className="bg-amber-500 hover:bg-amber-600 border-none font-bold text-white text-[9px] py-0.5 px-2 rounded-md uppercase tracking-wider">
                Pro Tip
              </Badge>
              <h4 className="text-sm font-extrabold text-foreground tracking-tight">
                Build it tonight with the Starter Kit
              </h4>
              <p className="text-muted-foreground text-xs md:text-sm leading-relaxed">
                All components for this project come included in our EZCirkit Starter Kit. Skip the parts hunt and start building immediately.
              </p>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
