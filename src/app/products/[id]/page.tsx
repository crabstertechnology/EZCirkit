'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { 
  Star, Heart, ShoppingCart, ArrowRight, ShieldCheck, 
  Truck, ArrowRightLeft, Coins, RotateCcw, Copy, 
  Download, ExternalLink, Calendar, Check, AlertCircle, Plus, Minus
} from 'lucide-react';
import { useFirestore, useDoc, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { doc, collection, query, limit, where, getDoc, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCart } from '@/context/cart-context';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

interface Review {
  id?: string;
  name: string;
  rating: number;
  comment: string;
  userId?: string;
  createdAt?: any;
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { addToCart, cartItems } = useCart();
  const { toast } = useToast();

  // State controls
  const [activeImage, setActiveImage] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [pincode, setPincode] = useState('');
  const [pincodeStatus, setPincodeStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  
  // Magnifier Zoom Feature State
  const [showZoom, setShowZoom] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 0, y: 0 });
  const [lensPos, setLensPos] = useState({ top: 0, left: 0 });
  
  // Reviews state
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewName, setReviewName] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [hasPurchased, setHasPurchased] = useState(false);
  const [isVerifyingPurchase, setIsVerifyingPurchase] = useState(true);

  // Sync wishlist from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('wishlist');
      setWishlist(saved ? JSON.parse(saved) : []);
    } catch (e) {
      setWishlist([]);
    }
  }, []);

  const toggleWishlist = (id: string, name: string) => {
    let updated;
    const isAdded = wishlist.includes(id);
    if (isAdded) {
      updated = wishlist.filter(item => item !== id);
      toast({
        title: "Removed from Wishlist",
        description: `${name} has been removed.`,
      });
    } else {
      updated = [...wishlist, id];
      toast({
        title: "Added to Wishlist",
        description: `${name} has been added to your wishlist.`,
      });
    }
    setWishlist(updated);
    localStorage.setItem('wishlist', JSON.stringify(updated));
    window.dispatchEvent(new Event('wishlist-updated'));
  };

  // Check if user has purchased this specific product
  useEffect(() => {
    if (isUserLoading || !firestore) {
      return;
    }
    if (!user) {
      setHasPurchased(false);
      setIsVerifyingPurchase(false);
      return;
    }

    const checkPurchaseStatus = async () => {
      try {
        const ordersRef = collection(firestore, 'users', user.uid, 'orders');
        const q = query(ordersRef, where('status', 'in', ['paid', 'shipped', 'delivered']));
        const querySnapshot = await getDocs(q);
        
        let purchased = false;
        
        // Loop through each paid order and check its items subcollection
        for (const orderDoc of querySnapshot.docs) {
          const itemsRef = collection(firestore, 'users', user.uid, 'orders', orderDoc.id, 'items');
          const itemsSnapshot = await getDocs(itemsRef);
          const hasItem = itemsSnapshot.docs.some(doc => doc.data().productId === productId);
          if (hasItem) {
            purchased = true;
            break;
          }
        }
        
        setHasPurchased(purchased);
      } catch (err) {
        console.error("Error verifying purchase status:", err);
        setHasPurchased(false);
      } finally {
        setIsVerifyingPurchase(false);
      }
    };

    checkPurchaseStatus();
  }, [user, isUserLoading, firestore, productId]);

  // Pre-fill review name when user is logged in
  useEffect(() => {
    if (user?.displayName) {
      setReviewName(user.displayName);
    }
  }, [user]);

  // Fetch product document
  const productDocRef = useMemoFirebase(
    () => (firestore && productId ? doc(firestore, 'products', productId) : null),
    [firestore, productId]
  );
  const { data: product, isLoading: isProductLoading } = useDoc<any>(productDocRef);

  // Fetch reviews collection
  const reviewsQuery = useMemoFirebase(
    () =>
      firestore && productId
        ? query(collection(firestore, 'products', productId, 'reviews'))
        : null,
    [firestore, productId]
  );
  const { data: reviews, isLoading: isReviewsLoading } = useCollection<Review>(reviewsQuery);

  // Fetch related products (same category)
  const category = product?.category || 'Components';
  const relatedQuery = useMemoFirebase(
    () =>
      firestore && category
        ? query(
            collection(firestore, 'products'),
            where('category', '==', category),
            limit(4)
          )
        : null,
    [firestore, category]
  );
  const { data: relatedProducts } = useCollection<any>(relatedQuery);

  // Set default main image
  useEffect(() => {
    if (product?.image) {
      setActiveImage(product.image);
    }
  }, [product]);

  // Gallery Array memoized
  const gallery = React.useMemo(() => {
    if (!product) return [];
    return [product.image, ...(product.gallery || [])].filter(Boolean);
  }, [product]);

  // Auto slide gallery images every 3 seconds (pauses when user zooms / hovers)
  useEffect(() => {
    if (gallery.length <= 1 || showZoom) return;
    const interval = setInterval(() => {
      setActiveImage((current) => {
        const currentIndex = gallery.indexOf(current);
        if (currentIndex === -1) {
          return gallery[0];
        }
        const nextIndex = (currentIndex + 1) % gallery.length;
        return gallery[nextIndex];
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [gallery, showZoom]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const rect = container.getBoundingClientRect();

    // Mouse coordinates relative to container
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Lens dimensions
    const lensWidth = 140;
    const lensHeight = 140;

    let left = x - lensWidth / 2;
    let top = y - lensHeight / 2;

    // Constrain lens inside container boundary
    if (left < 0) left = 0;
    if (left > rect.width - lensWidth) left = rect.width - lensWidth;
    if (top < 0) top = 0;
    if (top > rect.height - lensHeight) top = rect.height - lensHeight;

    setLensPos({ top, left });

    // Calculate percentage position
    const maxX = rect.width - lensWidth;
    const maxY = rect.height - lensHeight;

    const pctX = maxX > 0 ? (left / maxX) * 100 : 0;
    const pctY = maxY > 0 ? (top / maxY) * 100 : 0;

    setZoomPos({ x: pctX, y: pctY });
  };

  if (isProductLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground text-sm font-semibold">Loading product details...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4">
        <div className="text-center space-y-6 max-w-md">
          <AlertCircle className="h-16 w-16 text-destructive mx-auto" />
          <h2 className="text-2xl font-black font-headline">Product Not Found</h2>
          <p className="text-muted-foreground text-sm">The product you are looking for does not exist or has been removed.</p>
          <Button asChild className="bg-primary text-white">
            <Link href="/products">Browse All Products</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Calculate discount
  const originalPrice = product.originalPrice || product.price;
  const priceDiff = originalPrice - product.price;
  const discountPercent = originalPrice > product.price ? Math.round((priceDiff / originalPrice) * 100) : 0;

  // Stock status
  const isOutOfStock = product.stock <= 0;
  const stockPercentage = Math.min((product.stock / 25) * 100, 100);

  // Parse list values helper
  const parseMultiline = (text?: string) => {
    if (!text) return [];
    return text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  };

  const featuresList = parseMultiline(product.features);
  const specificationsList = parseMultiline(product.specifications).map(line => {
    const parts = line.split(':');
    return {
      label: parts[0]?.trim() || '',
      value: parts.slice(1).join(':')?.trim() || ''
    };
  });
  const resourcesList = parseMultiline(product.additionalResources).map(line => {
    const parts = line.split(':');
    return {
      name: parts[0]?.trim() || 'Link',
      url: parts.slice(1).join(':')?.trim() || '#'
    };
  });

  // Average Rating
  const averageRating = reviews && reviews.length > 0 
    ? Number((reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1))
    : 0.0;
  const reviewsCount = reviews?.length || 0;

  // Handle Add To Cart
  const handleAddToCart = () => {
    if (isOutOfStock) return;
    for (let i = 0; i < quantity; i++) {
      addToCart(product);
    }
    toast({
      title: "Added to Cart",
      description: `${quantity} x ${product.name} added to your shopping cart.`
    });
  };

  // Handle Buy Now
  const handleBuyNow = () => {
    if (isOutOfStock) return;
    const inCart = cartItems.find(item => item.id === product.id);
    if (!inCart) {
      addToCart(product);
    }
    router.push('/checkout');
  };

  // Pincode check handler
  const handlePincodeCheck = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pincode || pincode.trim().length !== 6 || isNaN(Number(pincode))) {
      setPincodeStatus({ type: 'error', message: 'Enter a valid 6-digit pin code.' });
      return;
    }
    setPincodeStatus({ 
      type: 'success', 
      message: 'Cash on Delivery & standard shipping available! Delivered in 2-4 days.' 
    });
  };

  // Review submission
  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({ variant: 'destructive', title: 'Please log in to write a review.' });
      return;
    }
    if (!hasPurchased) {
      toast({ variant: 'destructive', title: 'Only verified buyers can leave a review.' });
      return;
    }
    if (!reviewName || !reviewComment) {
      toast({ variant: 'destructive', title: 'Please fill all fields.' });
      return;
    }
    setIsSubmittingReview(true);
    try {
      const reviewsCol = collection(firestore!, 'products', productId, 'reviews');
      await addDoc(reviewsCol, {
        name: reviewName,
        rating: reviewRating,
        comment: reviewComment,
        userId: user.uid,
        createdAt: serverTimestamp()
      });
      toast({ title: 'Thank you! Your review has been published.' });
      setReviewName(user.displayName || '');
      setReviewComment('');
      setReviewRating(5);
      setIsReviewModalOpen(false);
    } catch (e) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Failed to submit review.' });
    } finally {
      setIsSubmittingReview(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50/50 dark:bg-zinc-950 text-foreground pt-28 md:pt-40 pb-16">
      <div className="container mx-auto px-4 md:px-6 space-y-12">
        
        {/* Breadcrumbs */}
        <nav className="text-xs md:text-sm text-muted-foreground flex items-center gap-1.5 flex-wrap">
          <Link href="/" className="hover:text-primary transition-colors font-semibold">Home</Link>
          <span>&gt;</span>
          <Link href="/products" className="hover:text-primary transition-colors font-semibold">Products</Link>
          <span>&gt;</span>
          <span className="text-foreground font-bold line-clamp-1">{product.name}</span>
        </nav>

        {/* Row 1: Images Gallery & Order controls */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          
          {/* Left Column: Image viewer */}
          <div className="lg:col-span-6 space-y-4">
            <div 
              className="w-full rounded-2xl overflow-hidden bg-white border border-border/80 relative flex items-center justify-center p-6 shadow-sm cursor-crosshair select-none" 
              style={{ aspectRatio: '1 / 1' }}
              onMouseEnter={() => setShowZoom(true)}
              onMouseLeave={() => setShowZoom(false)}
              onMouseMove={handleMouseMove}
            >
              <Image
                src={activeImage || product.image}
                alt={product.name}
                fill
                className="object-contain p-4 select-none pointer-events-none"
                priority
              />
              {discountPercent > 0 && (
                <Badge className="absolute top-4 left-4 bg-red-500 hover:bg-red-600 border-none font-bold text-white text-xs py-1 px-3 rounded-md z-10">
                  Sale {discountPercent}%
                </Badge>
              )}

              {/* Lens Selector Overlay */}
              {showZoom && (
                <div 
                  className="absolute border border-primary/50 bg-primary/10 pointer-events-none z-10 rounded-lg shadow-sm"
                  style={{
                    width: '140px',
                    height: '140px',
                    top: `${lensPos.top}px`,
                    left: `${lensPos.left}px`,
                    backgroundImage: 'radial-gradient(circle, rgba(59,130,246,0.15) 1px, transparent 1px)',
                    backgroundSize: '8px 8px',
                  }}
                />
              )}

              {/* High-fidelity Zoom Window */}
              {showZoom && (
                <div 
                  className="hidden lg:block absolute left-[104%] top-0 w-full h-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 z-50 rounded-2xl shadow-2xl overflow-hidden pointer-events-none"
                  style={{
                    backgroundImage: `url(${activeImage || product.image})`,
                    backgroundPosition: `${zoomPos.x}% ${zoomPos.y}%`,
                    backgroundSize: '250%', // 2.5x zoom factor
                    backgroundRepeat: 'no-repeat'
                  }}
                />
              )}
            </div>

            {/* Gallery Thumbnails */}
            {gallery.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {gallery.map((img, idx) => {
                  const isActive = activeImage === img;
                  return (
                    <button
                      key={idx}
                      onClick={() => setActiveImage(img)}
                      className={`relative w-20 h-20 border rounded-xl overflow-hidden bg-white flex-shrink-0 transition-all p-1.5 ${
                        isActive ? 'ring-2 ring-primary border-primary' : 'border-border/80 hover:border-zinc-400'
                      }`}
                    >
                      <img src={img} alt={`Gallery image ${idx}`} className="w-full h-full object-contain rounded-lg" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Checkout info */}
          <div className="lg:col-span-6 space-y-6">
            
            {/* Branding details */}
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2 items-center text-xs font-black uppercase tracking-wider text-muted-foreground">
                <span className="text-primary font-extrabold">{product.brand || 'Crabster'}</span>
                <span className="text-zinc-300 dark:text-zinc-700">|</span>
                <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10 border-none font-bold text-[9px] tracking-wide py-0.5 px-2 rounded">
                  Free Shipping
                </Badge>
                <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 hover:bg-blue-500/10 border-none font-bold text-[9px] tracking-wide py-0.5 px-2 rounded">
                  Best Price Guaranteed
                </Badge>
              </div>

              <h1 className="text-2xl md:text-3xl font-black font-headline text-foreground leading-tight">
                {product.name}
              </h1>

              {/* Star Rating Summary */}
              <div className="flex items-center gap-2 pt-1">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-4 w-4 ${
                        star <= Math.round(averageRating) 
                          ? 'fill-amber-400 text-amber-400' 
                          : 'text-zinc-300 dark:text-zinc-700'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-xs md:text-sm font-bold text-muted-foreground">
                  {averageRating} ({reviewsCount} customer reviews)
                </span>
              </div>
            </div>

            <hr className="border-border/60" />

            {/* Pricing Section */}
            <div className="space-y-1 bg-zinc-50 dark:bg-zinc-900/40 p-4 rounded-2xl border border-border/50">
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="text-3xl font-black text-primary">₹{product.price}/-</span>
                {originalPrice > product.price && (
                  <>
                    <span className="text-lg text-muted-foreground line-through font-bold">₹{originalPrice}/-</span>
                    <Badge className="bg-emerald-500 hover:bg-emerald-600 border-none font-black text-white text-[10px] py-1 px-2.5 rounded-lg shadow-sm">
                      SAVE ₹{priceDiff}
                    </Badge>
                  </>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground font-semibold">Incl. GST (No Hidden Charges)</p>
            </div>

            {/* Stock Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between items-baseline text-xs font-bold">
                <span className={isOutOfStock ? "text-destructive" : "text-muted-foreground"}>
                  {isOutOfStock 
                    ? "Out of Stock" 
                    : `Please hurry! Only ${product.stock} left in stock`}
                </span>
                {!isOutOfStock && <span className="text-muted-foreground">{Math.round(stockPercentage)}% left</span>}
              </div>
              <div className="h-2 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 rounded-full ${
                    isOutOfStock ? "bg-red-500" : product.stock <= 5 ? "bg-red-500" : "bg-emerald-500"
                  }`} 
                  style={{ width: `${isOutOfStock ? 0 : stockPercentage}%` }}
                />
              </div>
            </div>

            {/* Order Controls */}
            {!isOutOfStock ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-black uppercase tracking-wider text-muted-foreground">Quantity:</span>
                  <div className="flex items-center border border-border rounded-xl bg-background overflow-hidden h-11">
                    <button 
                      onClick={() => setQuantity(prev => Math.max(prev - 1, 1))}
                      className="px-3 hover:bg-muted active:scale-95 transition-all text-muted-foreground"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-10 text-center font-bold text-sm select-none">{quantity}</span>
                    <button 
                      onClick={() => setQuantity(prev => Math.min(prev + 1, product.stock))}
                      className="px-3 hover:bg-muted active:scale-95 transition-all text-muted-foreground"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="flex gap-4 flex-col sm:flex-row pt-2">
                  <Button 
                    onClick={handleAddToCart}
                    className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-white font-bold h-12 rounded-xl flex items-center justify-center gap-2 shadow-md transition-all active:scale-98"
                  >
                    <ShoppingCart className="h-5 w-5" />
                    <span>ADD TO CART</span>
                  </Button>
                  <Button 
                    onClick={handleBuyNow}
                    className="flex-1 bg-primary hover:bg-primary/95 text-white font-black h-12 rounded-xl flex items-center justify-center gap-2 shadow-md transition-all active:scale-98"
                  >
                    <span>BUY NOW</span>
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="pt-2">
                <Button disabled className="w-full bg-zinc-300 dark:bg-zinc-800 text-zinc-500 font-bold h-12 rounded-xl">
                  OUT OF STOCK
                </Button>
              </div>
            )}

            {/* Wishlist Button */}
            <div className="flex justify-between items-center gap-4 pt-1">
              <button
                onClick={() => toggleWishlist(product.id, product.name)}
                className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-red-500 transition-colors uppercase tracking-wider"
              >
                <Heart className={`h-4.5 w-4.5 ${wishlist.includes(product.id) ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`} />
                <span>{wishlist.includes(product.id) ? 'Added to Wishlist' : 'Add to Wishlist'}</span>
              </button>
            </div>

            {/* Pincode Delivery Check Form */}
            <form onSubmit={handlePincodeCheck} className="border border-border/80 p-4 rounded-2xl bg-white dark:bg-zinc-950/20 space-y-3">
              <label htmlFor="pincode-input" className="text-xs font-black uppercase tracking-wider text-muted-foreground block">
                Delivery Pincode Check
              </label>
              <div className="flex gap-2">
                <Input
                  id="pincode-input"
                  type="text"
                  placeholder="Enter 6-digit pincode"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  maxLength={6}
                  className="rounded-xl border-border bg-background"
                />
                <Button type="submit" variant="secondary" className="rounded-xl font-bold bg-zinc-900 text-white hover:bg-zinc-800">
                  Check
                </Button>
              </div>
              {pincodeStatus && (
                <p className={`text-xs font-bold ${pincodeStatus.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>
                  {pincodeStatus.message}
                </p>
              )}
            </form>

          </div>
        </div>

        {/* Row 2: Features, SKU & Trust Indicators */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-8 border-t border-border/60">
          {/* Trust Row Left */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Trust highlights */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 py-4 border-b border-border/40">
              <div className="flex flex-col items-center text-center p-3 space-y-2">
                <Truck className="h-7 w-7 text-primary" />
                <span className="text-[10px] font-black uppercase tracking-wide leading-tight text-muted-foreground">Free delivery<br />above ₹999</span>
              </div>
              <div className="flex flex-col items-center text-center p-3 space-y-2">
                <ShieldCheck className="h-7 w-7 text-primary" />
                <span className="text-[10px] font-black uppercase tracking-wide leading-tight text-muted-foreground">Technical<br />Support</span>
              </div>
              <div className="flex flex-col items-center text-center p-3 space-y-2">
                <ArrowRightLeft className="h-7 w-7 text-primary" />
                <span className="text-[10px] font-black uppercase tracking-wide leading-tight text-muted-foreground">Easy 7-day<br />Returns</span>
              </div>
              <div className="flex flex-col items-center text-center p-3 space-y-2">
                <Coins className="h-7 w-7 text-primary" />
                <span className="text-[10px] font-black uppercase tracking-wide leading-tight text-muted-foreground">Earn points on<br />every order</span>
              </div>
              <div className="flex flex-col items-center text-center p-3 space-y-2">
                <RotateCcw className="h-7 w-7 text-primary" />
                <span className="text-[10px] font-black uppercase tracking-wide leading-tight text-muted-foreground">Cash on<br />Delivery</span>
              </div>
            </div>

            {/* SKU and Specifications bullet highlights */}
            <div className="space-y-4">
              {product.sku && (
                <p className="text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider">
                  SKU: <span className="text-foreground font-black">{product.sku}</span>
                </p>
              )}

              {/* Dynamic Feature list */}
              {featuresList.length > 0 ? (
                <div className="space-y-3">
                  <h3 className="text-sm font-black uppercase tracking-wider text-foreground">Bullet Highlights</h3>
                  <ul className="space-y-2.5">
                    {featuresList.map((feat, idx) => (
                      <li key={idx} className="flex gap-2.5 items-start text-xs md:text-sm text-muted-foreground leading-relaxed">
                        <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">Add feature highlights in the admin panel to populate bullet points.</p>
              )}
            </div>

          </div>

          {/* Bulk order callout right */}
          <div className="lg:col-span-4">
            <Card className="border border-border/80 rounded-2xl overflow-hidden bg-white shadow-sm">
              <CardContent className="p-6 space-y-4">
                <h3 className="text-lg font-black font-headline text-foreground">Bulk Order Inquiry</h3>
                <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                  Looking for higher quantities of <strong>{product.name}</strong> for labs, student projects, or custom retail orders? Get in touch for custom pricing.
                </p>
                <div className="pt-2 space-y-2.5">
                  <Button asChild className="w-full bg-[#00e676] hover:bg-[#00c853] text-white font-extrabold h-11 rounded-xl">
                    <a href="https://wa.me/919999999999" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2">
                      <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.966C16.59 2.012 14.12 1.01 11.5 1.01c-5.448 0-9.873 4.372-9.877 9.802-.001 1.777.472 3.511 1.371 5.074l-1.0 3.655 3.754-.972c1.558.85 3.195 1.3 4.899 1.3z" />
                      </svg>
                      <span>INQUIRE ON WHATSAPP</span>
                    </a>
                  </Button>
                  <Button asChild variant="outline" className="w-full border-border rounded-xl font-bold h-11">
                    <Link href="/contact-us">Submit Bulk Request</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Row 3: Product Description & Spec details Tabs */}
        <div className="pt-8 border-t border-border/60">
          <Tabs defaultValue="desc" className="w-full space-y-6">
            <TabsList className="flex flex-wrap justify-start bg-zinc-100 dark:bg-zinc-900 border border-border rounded-xl p-1 gap-1">
              <TabsTrigger value="desc" className="rounded-lg font-bold text-xs md:text-sm">Description</TabsTrigger>
              <TabsTrigger value="specs" className="rounded-lg font-bold text-xs md:text-sm">Specifications</TabsTrigger>
              <TabsTrigger value="resources" className="rounded-lg font-bold text-xs md:text-sm">Additional Resources</TabsTrigger>
              <TabsTrigger value="warranty" className="rounded-lg font-bold text-xs md:text-sm">Warranty</TabsTrigger>
              <TabsTrigger value="shipping" className="rounded-lg font-bold text-xs md:text-sm">Shipping & Return</TabsTrigger>
            </TabsList>

            {/* Description Content */}
            <TabsContent value="desc" className="p-6 border border-border/60 rounded-2xl bg-white dark:bg-zinc-950/20 space-y-4">
              <h3 className="text-base font-black uppercase tracking-wider text-foreground">Detailed Product Description</h3>
              <p className="text-xs md:text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {product.description || "No description provided yet."}
              </p>
            </TabsContent>

            {/* Specifications Content */}
            <TabsContent value="specs" className="p-6 border border-border/60 rounded-2xl bg-white dark:bg-zinc-950/20">
              <h3 className="text-base font-black uppercase tracking-wider text-foreground mb-4">Technical Specifications</h3>
              {specificationsList.length > 0 ? (
                <div className="border border-border/80 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-left text-xs md:text-sm border-collapse">
                    <thead>
                      <tr className="bg-zinc-50 border-b border-border/80">
                        <th className="p-3 font-black text-muted-foreground uppercase tracking-wider w-1/3">Feature</th>
                        <th className="p-3 font-black text-muted-foreground uppercase tracking-wider">Detail</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {specificationsList.map((spec, index) => (
                        <tr key={index} className="hover:bg-zinc-50/50">
                          <td className="p-3 font-bold text-foreground">{spec.label}</td>
                          <td className="p-3 text-muted-foreground">{spec.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">Add key-value specifications in the admin panel to populate technical values.</p>
              )}
            </TabsContent>

            {/* Additional Resources Content */}
            <TabsContent value="resources" className="p-6 border border-border/60 rounded-2xl bg-white dark:bg-zinc-950/20 space-y-4">
              <h3 className="text-base font-black uppercase tracking-wider text-foreground">Downloads & Documentation</h3>
              {resourcesList.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {resourcesList.map((res, index) => (
                    <a
                      key={index}
                      href={res.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3.5 border border-border rounded-xl hover:border-primary hover:bg-zinc-50/50 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <Download className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
                        <span className="text-xs md:text-sm font-bold text-foreground">{res.name}</span>
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">No documentation files added for this product.</p>
              )}
            </TabsContent>

            {/* Warranty Content */}
            <TabsContent value="warranty" className="p-6 border border-border/60 rounded-2xl bg-white dark:bg-zinc-950/20 space-y-4">
              <h3 className="text-base font-black uppercase tracking-wider text-foreground">Warranty Terms</h3>
              <p className="text-xs md:text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {product.warranty || "Warranty coverage varies by manufacturer. Basic cover for component failures applies."}
              </p>
            </TabsContent>

            {/* Shipping Content */}
            <TabsContent value="shipping" className="p-6 border border-border/60 rounded-2xl bg-white dark:bg-zinc-950/20 space-y-4">
              <h3 className="text-base font-black uppercase tracking-wider text-foreground">Shipping and Delivery</h3>
              <p className="text-xs md:text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {product.shipping || "Fast, tracked shipping on all orders. Free shipping is automatically applied for purchases exceeding ₹999."}
              </p>
            </TabsContent>
          </Tabs>
        </div>

        {/* Row 4: Customer Reviews list */}
        <div className="pt-8 border-t border-border/60 space-y-8">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div className="space-y-1">
              <h2 className="text-xl md:text-2xl font-black font-headline text-foreground">Customer Reviews</h2>
              <p className="text-xs text-muted-foreground font-semibold">Read reviews and share your own experience.</p>
            </div>

            {/* Write a review modal dialog trigger */}
            <Dialog open={isReviewModalOpen} onOpenChange={setIsReviewModalOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary text-white font-bold h-10 rounded-xl">
                  Write a review
                </Button>
              </DialogTrigger>
              {!user ? (
                <DialogContent className="max-w-md rounded-2xl border-border text-center p-6 space-y-4">
                  <DialogHeader>
                    <DialogTitle className="font-headline font-black text-lg">Submit Feedback</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">Please log in to write a review for this product.</p>
                    <Button asChild className="w-full bg-primary text-white font-bold h-11 rounded-xl">
                      <Link href="/login">Log In</Link>
                    </Button>
                  </div>
                </DialogContent>
              ) : isVerifyingPurchase ? (
                <DialogContent className="max-w-md rounded-2xl border-border text-center p-6 space-y-4">
                  <DialogHeader>
                    <DialogTitle className="font-headline font-black text-lg">Submit Feedback</DialogTitle>
                  </DialogHeader>
                  <div className="flex flex-col items-center justify-center p-6 space-y-3">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <p className="text-xs text-muted-foreground font-semibold">Verifying purchase status...</p>
                  </div>
                </DialogContent>
              ) : !hasPurchased ? (
                <DialogContent className="max-w-md rounded-2xl border-border text-center p-6 space-y-4">
                  <DialogHeader>
                    <DialogTitle className="font-headline font-black text-lg">Verified Purchase Required</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">Only verified buyers of <strong>{product.name}</strong> can write a review. Purchase the item to share your thoughts!</p>
                    <Button onClick={() => setIsReviewModalOpen(false)} className="w-full bg-primary text-white font-bold h-11 rounded-xl">
                      Close
                    </Button>
                  </div>
                </DialogContent>
              ) : reviews?.some(r => r.userId === user.uid) ? (
                <DialogContent className="max-w-md rounded-2xl border-border text-center p-6 space-y-4">
                  <DialogHeader>
                    <DialogTitle className="font-headline font-black text-lg">Feedback Already Submitted</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">You have already submitted a review for this product.</p>
                    <Button onClick={() => setIsReviewModalOpen(false)} className="w-full bg-primary text-white font-bold h-11 rounded-xl">
                      Close
                    </Button>
                  </div>
                </DialogContent>
              ) : (
                <DialogContent className="max-w-md rounded-2xl border-border">
                  <DialogHeader>
                    <DialogTitle className="font-headline font-black text-lg">Submit Feedback</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleAddReview} className="space-y-4 pt-2">
                    <div className="space-y-1.5">
                      <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Your Name</label>
                      <Input 
                        placeholder="Enter name"
                        value={reviewName}
                        onChange={(e) => setReviewName(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Rating Score</label>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setReviewRating(star)}
                            className="hover:scale-110 active:scale-95 transition-transform"
                          >
                            <Star 
                              className={`h-7 w-7 ${
                                star <= reviewRating 
                                  ? 'fill-amber-400 text-amber-400' 
                                  : 'text-zinc-300 dark:text-zinc-700'
                              }`} 
                            />
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Review Details</label>
                      <Textarea 
                        placeholder="Write your comment..."
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        required
                        className="h-24"
                      />
                    </div>

                    <Button type="submit" disabled={isSubmittingReview} className="w-full bg-primary text-white font-bold h-11 rounded-xl">
                      {isSubmittingReview ? 'Submitting...' : 'Post Review'}
                    </Button>
                  </form>
                </DialogContent>
              )}
            </Dialog>
          </div>

          {/* Aggregate Rating Score Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center p-6 border border-border/60 rounded-2xl bg-white dark:bg-zinc-950/20">
            <div className="text-center md:border-r border-border/60 py-4 space-y-2">
              <p className="text-5xl font-black text-foreground">{averageRating}</p>
              <div className="flex justify-center gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-4.5 w-4.5 ${
                      star <= Math.round(averageRating) 
                        ? 'fill-amber-400 text-amber-400' 
                        : 'text-zinc-300 dark:text-zinc-700'
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs font-bold text-muted-foreground">Based on {reviewsCount} ratings</p>
            </div>

            <div className="md:col-span-2 space-y-2 px-2 md:px-6">
              {[5, 4, 3, 2, 1].map((stars) => {
                const count = reviews?.filter(r => r.rating === stars).length || 0;
                const percent = reviewsCount > 0 ? (count / reviewsCount) * 100 : 0;
                return (
                  <div key={stars} className="flex items-center gap-3 text-xs font-bold">
                    <span className="w-3 text-right">{stars}</span>
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400 shrink-0" />
                    <div className="flex-1 h-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-400 rounded-full" style={{ width: `${percent}%` }} />
                    </div>
                    <span className="w-8 text-right text-muted-foreground">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* List of reviews */}
          {reviews && reviews.length > 0 ? (
            <div className="space-y-6">
              {reviews.map((rev) => (
                <div key={rev.id} className="p-5 border border-border/50 rounded-2xl bg-white shadow-sm space-y-3">
                  <div className="flex justify-between items-start flex-wrap gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-black text-foreground">{rev.name}</p>
                        <Badge variant="outline" className="text-[9px] font-black uppercase text-emerald-600 border-emerald-500/20 bg-emerald-500/5">Verified Buyer</Badge>
                      </div>
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-3 w-3 ${
                              star <= rev.rating 
                                ? 'fill-amber-400 text-amber-400' 
                                : 'text-zinc-200'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    {rev.createdAt && (
                      <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(rev.createdAt.seconds * 1000).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">{rev.comment}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center border border-dashed rounded-3xl text-muted-foreground text-sm font-semibold max-w-md mx-auto">
              Be the first to write a review for this product!
            </div>
          )}
        </div>

        {/* Row 5: Related products */}
        {relatedProducts && relatedProducts.length > 1 && (
          <div className="pt-12 border-t border-border/60 space-y-6">
            <h2 className="text-xl md:text-2xl font-black font-headline text-foreground">Related Products</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts
                .filter(p => p.id !== productId)
                .slice(0, 4)
                .map((p) => {
                  const disc = p.originalPrice > p.price ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100) : 0;
                  return (
                    <Card key={p.id} className="group border border-border/60 hover:shadow-lg transition-all rounded-2xl overflow-hidden flex flex-col justify-between cursor-pointer" onClick={() => router.push(`/products/${p.id}`)}>
                      <div className="aspect-[4/3] bg-zinc-100 w-full relative flex items-center justify-center p-2 border-b">
                        <img src={p.image} alt={p.name} className="w-full h-full object-contain p-2 transition-transform group-hover:scale-105" />
                        {disc > 0 && <Badge className="absolute top-2 left-2 bg-orange-500 hover:bg-orange-600 text-white font-bold text-[9px] py-0.5 px-1.5 rounded">-{disc}%</Badge>}
                      </div>
                      <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                        <h4 className="text-xs md:text-sm font-black text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-tight">{p.name}</h4>
                        <div className="flex justify-between items-center border-t border-border/40 pt-2">
                          <span className="text-sm font-black text-primary">₹{p.price}/-</span>
                          <Button size="sm" className="h-7 px-2.5 bg-primary text-white text-[10px] rounded-lg font-bold">VIEW</Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
