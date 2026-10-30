'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, doc, deleteDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import ProductForm from '@/components/admin/product-form';
import {
  PlusCircle,
  Trash2,
  Edit,
  LayoutGrid,
  List as ListIcon,
  Plus,
  Minus,
  Search,
  X,
  Loader2,
  Package,
  PackageCheck,
  AlertTriangle,
  PackageX,
  Check,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  description?: string;
  stock: number;
  image: string;
  category?: string;
  sku?: string;
  purchasePrice?: number;
  tax?: number;
  minStockLevel?: number;
}

type StockFilterType = 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';
type ViewModeType = 'grid' | 'list';

const ProductsPage = () => {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [viewMode, setViewMode] = useState<ViewModeType>('grid');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<StockFilterType>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [updatingStockId, setUpdatingStockId] = useState<string | null>(null);

  const productsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'products') : null),
    [firestore]
  );
  const { data: products, isLoading } = useCollection<Product>(productsQuery);
  
  const [stockLevels, setStockLevels] = useState<Record<string, number | string>>({});

  useEffect(() => {
    if (products) {
      const initialStock = products.reduce((acc, product) => {
        acc[product.id] = product.stock;
        return acc;
      }, {} as Record<string, number>);
      setStockLevels(initialStock);
    }
  }, [products]);

  // Extract unique categories
  const categories = useMemo(() => {
    if (!products) return [];
    const catSet = new Set<string>();
    products.forEach((p) => {
      if (p.category && p.category.trim()) {
        catSet.add(p.category.trim());
      }
    });
    return Array.from(catSet).sort();
  }, [products]);

  // Stock KPI counts
  const kpis = useMemo(() => {
    if (!products) return { total: 0, inStock: 0, lowStock: 0, outOfStock: 0 };
    let inStock = 0;
    let lowStock = 0;
    let outOfStock = 0;

    products.forEach((p) => {
      const stock = Number(p.stock || 0);
      const minThreshold = p.minStockLevel || 5;
      if (stock === 0) {
        outOfStock++;
      } else if (stock <= minThreshold) {
        lowStock++;
      } else {
        inStock++;
      }
    });

    return {
      total: products.length,
      inStock,
      lowStock,
      outOfStock,
    };
  }, [products]);

  // Filtered products list
  const filteredProducts = useMemo(() => {
    if (!products) return [];
    return products.filter((product) => {
      // Category filter
      if (selectedCategory !== 'all' && product.category !== selectedCategory) {
        return false;
      }

      // Stock status filter
      const stock = Number(product.stock || 0);
      const minThreshold = product.minStockLevel || 5;
      if (stockFilter === 'out_of_stock' && stock !== 0) return false;
      if (stockFilter === 'low_stock' && (stock === 0 || stock > minThreshold)) return false;
      if (stockFilter === 'in_stock' && stock <= minThreshold) return false;

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = product.name?.toLowerCase().includes(q);
        const skuMatch = product.sku ? product.sku.toLowerCase().includes(q) : false;
        const idMatch = product.id.toLowerCase().includes(q);
        const catMatch = product.category ? product.category.toLowerCase().includes(q) : false;
        if (!nameMatch && !skuMatch && !idMatch && !catMatch) return false;
      }

      return true;
    });
  }, [products, selectedCategory, stockFilter, searchQuery]);

  const handleStockChange = (productId: string, value: string) => {
    const newStock = value === '' ? '' : parseInt(value, 10);
    setStockLevels((prev) => ({
      ...prev,
      [productId]: isNaN(newStock as number) ? '' : newStock,
    }));
  };

  const handleStockIncrement = (productId: string, delta: number) => {
    setStockLevels((prev) => {
      const currentVal =
        prev[productId] !== undefined && prev[productId] !== ''
          ? Number(prev[productId])
          : (products?.find((p) => p.id === productId)?.stock ?? 0);
      const nextVal = Math.max(0, currentVal + delta);
      return { ...prev, [productId]: nextVal };
    });
  };

  const handleUpdateStock = async (productId: string) => {
    const newStock = stockLevels[productId];
    if (newStock === undefined || newStock === '') {
      toast({ variant: 'destructive', title: 'Invalid stock value.' });
      return;
    }
    const newStockVal = typeof newStock === 'string' ? parseInt(newStock, 10) : newStock;
    if (isNaN(newStockVal) || newStockVal < 0) {
      toast({ variant: 'destructive', title: 'Invalid stock value.' });
      return;
    }

    setUpdatingStockId(productId);
    try {
      const res = await fetch('/api/billing/stock-adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          newStock: newStockVal,
          adminUser: user?.displayName || user?.email || 'Admin',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update stock');
      }

      toast({
        title: 'Stock updated successfully!',
        description: `Product stock level set to ${newStockVal}.`,
      });
    } catch (err: any) {
      console.error(err);
      toast({
        variant: 'destructive',
        title: 'Failed to update stock',
        description: err.message || 'Error occurred.',
      });
    } finally {
      setUpdatingStockId(null);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!firestore) return;
    const productDocRef = doc(firestore, 'products', productId);
    try {
      await deleteDoc(productDocRef);
      toast({ title: 'Product deleted successfully.' });
    } catch (e) {
      const permissionError = new FirestorePermissionError({
        path: productDocRef.path,
        operation: 'delete',
      });
      errorEmitter.emit('permission-error', permissionError);
    }
  };

  const handleOpenForm = (product: Product | null) => {
    setEditingProduct(product);
    setIsProductFormOpen(true);
  };

  const getStockStatus = (stock: number, minStockLevel = 5) => {
    const num = Number(stock || 0);
    if (num === 0) {
      return {
        label: 'Out of Stock',
        badgeClass: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800',
        dotClass: 'bg-red-500',
      };
    }
    if (num <= minStockLevel) {
      return {
        label: `Low Stock: ${num}`,
        badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800',
        dotClass: 'bg-amber-500',
      };
    }
    return {
      label: `In Stock: ${num}`,
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800',
      dotClass: 'bg-emerald-500',
    };
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Product Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Browse, filter, and adjust inventory levels across your catalog.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Grid / List View Toggle */}
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl border border-zinc-200 dark:border-zinc-700">
            <Button
              type="button"
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className={`h-8 px-3 rounded-lg gap-1.5 text-xs font-semibold ${
                viewMode === 'grid'
                  ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Grid</span>
            </Button>
            <Button
              type="button"
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className={`h-8 px-3 rounded-lg gap-1.5 text-xs font-semibold ${
                viewMode === 'list'
                  ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
              }`}
            >
              <ListIcon className="h-3.5 w-3.5" />
              <span>List</span>
            </Button>
          </div>

          {/* Add Product Modal Trigger */}
          <Dialog open={isProductFormOpen} onOpenChange={setIsProductFormOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() => handleOpenForm(null)}
                className="bg-orange-600 hover:bg-orange-700 text-white font-semibold shadow-sm h-10 px-4 rounded-xl cursor-pointer gap-2"
              >
                <PlusCircle className="h-4 w-4" />
                <span>Add New Product</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingProduct ? 'Edit Product' : 'Add a New Product'}</DialogTitle>
              </DialogHeader>
              <ProductForm onSave={() => setIsProductFormOpen(false)} product={editingProduct} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filter and Stats Bar */}
      <Card className="border-border shadow-sm">
        <CardContent className="p-4 sm:p-5 space-y-4">
          {/* Quick Stock Status Pills */}
          <div className="flex flex-wrap items-center gap-2 pb-1 border-b border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setStockFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                stockFilter === 'all'
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-sm'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200'
              }`}
            >
              <Package className="h-3.5 w-3.5" />
              <span>All Products</span>
              <span className="text-[11px] opacity-80 font-mono">({kpis.total})</span>
            </button>

            <button
              type="button"
              onClick={() => setStockFilter('in_stock')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                stockFilter === 'in_stock'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 hover:bg-emerald-100 border border-emerald-200/60'
              }`}
            >
              <PackageCheck className="h-3.5 w-3.5" />
              <span>In Stock</span>
              <span className="text-[11px] opacity-80 font-mono">({kpis.inStock})</span>
            </button>

            <button
              type="button"
              onClick={() => setStockFilter('low_stock')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                stockFilter === 'low_stock'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 hover:bg-amber-100 border border-amber-200/60'
              }`}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Low Stock (≤ 5)</span>
              <span className="text-[11px] opacity-80 font-mono">({kpis.lowStock})</span>
            </button>

            <button
              type="button"
              onClick={() => setStockFilter('out_of_stock')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                stockFilter === 'out_of_stock'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 hover:bg-red-100 border border-red-200/60'
              }`}
            >
              <PackageX className="h-3.5 w-3.5" />
              <span>Out of Stock</span>
              <span className="text-[11px] opacity-80 font-mono">({kpis.outOfStock})</span>
            </button>
          </div>

          {/* Search & Category Filter Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
            {/* Search Input */}
            <div className="sm:col-span-7 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products by name, SKU, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-9 rounded-xl h-10 border-zinc-200 dark:border-zinc-700 text-sm"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Category Dropdown */}
            <div className="sm:col-span-5">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="rounded-xl h-10 border-zinc-200 dark:border-zinc-700 text-sm">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">
                    All Categories ({products?.length || 0})
                  </SelectItem>
                  {categories.map((cat) => {
                    const count = products?.filter((p) => p.category === cat).length || 0;
                    return (
                      <SelectItem key={cat} value={cat}>
                        {cat} ({count})
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content: Grid View or List View */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          <p className="text-sm font-semibold text-muted-foreground">Loading products catalog...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <Card className="border-dashed p-12 text-center">
          <Package className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-foreground">No matching products found</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-1">
            {searchQuery || selectedCategory !== 'all' || stockFilter !== 'all'
              ? 'Try resetting your search query or filters to see all available products.'
              : "Click 'Add New Product' to begin stocking your catalog."}
          </p>
          {(searchQuery || selectedCategory !== 'all' || stockFilter !== 'all') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
                setStockFilter('all');
              }}
              className="mt-4 rounded-xl"
            >
              Reset Filters
            </Button>
          )}
        </Card>
      ) : viewMode === 'grid' ? (
        /* ================= GRID VIEW ================= */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredProducts.map((product) => {
            const currentStock = Number(stockLevels[product.id] ?? product.stock);
            const isStockModified = currentStock !== product.stock;
            const isUpdating = updatingStockId === product.id;
            const statusInfo = getStockStatus(product.stock, product.minStockLevel);

            return (
              <Card
                key={product.id}
                className="group border border-zinc-200 dark:border-zinc-800 hover:border-orange-300 dark:hover:border-orange-500/40 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between bg-white dark:bg-zinc-900"
              >
                <div>
                  {/* Product Image Container */}
                  <div className="relative aspect-square w-full bg-zinc-50 dark:bg-zinc-950/60 p-4 flex items-center justify-center border-b border-zinc-100 dark:border-zinc-800">
                    <Image
                      src={product.image || '/images/placeholder.png'}
                      alt={product.name}
                      width={220}
                      height={220}
                      className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-200"
                    />

                    {/* Category Tag */}
                    {product.category && (
                      <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-white/90 dark:bg-zinc-900/90 text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-zinc-700 text-[10px] font-bold tracking-wide uppercase shadow-xs">
                        {product.category}
                      </span>
                    )}

                    {/* Stock Status Badge */}
                    <Badge
                      variant="outline"
                      className={`absolute top-2.5 right-2.5 text-[10px] font-bold py-0.5 px-2 border shadow-xs ${statusInfo.badgeClass}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full mr-1.5 ${statusInfo.dotClass}`} />
                      {statusInfo.label}
                    </Badge>
                  </div>

                  {/* Card Body */}
                  <div className="p-3.5 space-y-2">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-base font-extrabold text-orange-600">
                        ₹{product.price}
                      </span>
                      {product.originalPrice && product.originalPrice > product.price && (
                        <span className="text-xs text-muted-foreground line-through">
                          ₹{product.originalPrice}
                        </span>
                      )}
                    </div>

                    <h4
                      className="font-semibold text-sm text-foreground line-clamp-2 leading-snug min-h-[2.5rem]"
                      title={product.name}
                    >
                      {product.name}
                    </h4>

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono">
                      <span>SKU: {product.sku || 'N/A'}</span>
                      <span className="truncate max-w-[100px]" title={product.id}>
                        ID: {product.id.slice(0, 8)}...
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Controls & Stock Stepper */}
                <div className="p-3.5 pt-0 space-y-3">
                  {/* Plus / Minus Stock Stepper */}
                  <div className="bg-zinc-50 dark:bg-zinc-800/60 p-2 rounded-xl border border-zinc-200/70 dark:border-zinc-700 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
                      <span>Update Stock</span>
                      <span>Current: {product.stock}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Decrement Button */}
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => handleStockIncrement(product.id, -1)}
                        className="h-8 w-8 rounded-lg shrink-0 border-zinc-300 dark:border-zinc-600 hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer"
                        title="Decrease stock by 1"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </Button>

                      {/* Numeric Input */}
                      <Input
                        type="number"
                        min="0"
                        value={stockLevels[product.id] ?? ''}
                        onChange={(e) => handleStockChange(product.id, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleUpdateStock(product.id);
                          }
                        }}
                        className="h-8 text-center font-bold text-sm rounded-lg p-0 border-zinc-300 dark:border-zinc-600 focus-visible:ring-orange-500"
                      />

                      {/* Increment Button */}
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => handleStockIncrement(product.id, 1)}
                        className="h-8 w-8 rounded-lg shrink-0 border-zinc-300 dark:border-zinc-600 hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer"
                        title="Increase stock by 1"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>

                      {/* Commit Update Button */}
                      <Button
                        type="button"
                        size="sm"
                        disabled={!isStockModified || isUpdating}
                        onClick={() => handleUpdateStock(product.id)}
                        className={`h-8 px-2.5 rounded-lg text-xs font-bold shrink-0 transition-all cursor-pointer ${
                          isStockModified
                            ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-xs'
                            : 'bg-zinc-200 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-600'
                        }`}
                      >
                        {isUpdating ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Check className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Actions: Edit & Delete */}
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenForm(product)}
                      className="flex-1 h-8 text-xs font-semibold rounded-lg gap-1.5 cursor-pointer border-zinc-200 dark:border-zinc-700"
                    >
                      <Edit className="h-3.5 w-3.5" />
                      <span>Edit</span>
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 border-zinc-200 dark:border-zinc-700 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete this product?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to permanently delete &quot;{product.name}&quot;?
                            This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteProduct(product.id)}
                            className="bg-red-600 hover:bg-red-700 text-white"
                          >
                            Delete Product
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        /* ================= LIST VIEW ================= */
        <Card className="border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-zinc-50 dark:bg-zinc-900/60">
                <TableRow>
                  <TableHead className="w-[38%]">Product Details</TableHead>
                  <TableHead className="w-[14%]">Category</TableHead>
                  <TableHead className="w-[12%]">Price</TableHead>
                  <TableHead className="w-[14%]">Stock Status</TableHead>
                  <TableHead className="w-[16%]">Adjust Stock</TableHead>
                  <TableHead className="w-[6%] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => {
                  const currentStock = Number(stockLevels[product.id] ?? product.stock);
                  const isStockModified = currentStock !== product.stock;
                  const isUpdating = updatingStockId === product.id;
                  const statusInfo = getStockStatus(product.stock, product.minStockLevel);

                  return (
                    <TableRow key={product.id} className="hover:bg-zinc-50/70 dark:hover:bg-zinc-900/50">
                      {/* Product Thumbnail + Name + ID */}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center p-1 shrink-0 overflow-hidden">
                            <Image
                              src={product.image || '/images/placeholder.png'}
                              alt={product.name}
                              width={48}
                              height={48}
                              className="max-h-full max-w-full object-contain"
                            />
                          </div>
                          <div className="space-y-0.5 min-w-0">
                            <p className="font-semibold text-sm text-foreground truncate max-w-md" title={product.name}>
                              {product.name}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                              {product.sku && <span>SKU: {product.sku}</span>}
                              <span>ID: {product.id.slice(0, 8)}...</span>
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      {/* Category */}
                      <TableCell>
                        {product.category ? (
                          <Badge variant="secondary" className="text-xs font-semibold">
                            {product.category}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      {/* Price */}
                      <TableCell>
                        <div className="space-y-0.5">
                          <span className="font-bold text-sm text-orange-600">₹{product.price}</span>
                          {product.originalPrice && product.originalPrice > product.price && (
                            <span className="text-xs text-muted-foreground line-through block">
                              ₹{product.originalPrice}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Stock Status Badge */}
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-xs font-bold py-1 px-2.5 border ${statusInfo.badgeClass}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full mr-1.5 ${statusInfo.dotClass}`} />
                          {statusInfo.label}
                        </Badge>
                      </TableCell>

                      {/* Stock Stepper Adjustment */}
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {/* Minus Button */}
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => handleStockIncrement(product.id, -1)}
                            className="h-8 w-8 rounded-lg shrink-0 border-zinc-300 dark:border-zinc-600 hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer"
                            title="Decrease stock by 1"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </Button>

                          {/* Numeric Input */}
                          <Input
                            type="number"
                            min="0"
                            value={stockLevels[product.id] ?? ''}
                            onChange={(e) => handleStockChange(product.id, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleUpdateStock(product.id);
                              }
                            }}
                            className="w-16 h-8 text-center font-bold text-sm rounded-lg p-0 border-zinc-300 dark:border-zinc-600 focus-visible:ring-orange-500"
                          />

                          {/* Plus Button */}
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => handleStockIncrement(product.id, 1)}
                            className="h-8 w-8 rounded-lg shrink-0 border-zinc-300 dark:border-zinc-600 hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer"
                            title="Increase stock by 1"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </Button>

                          {/* Save / Update Stock Button */}
                          <Button
                            type="button"
                            size="sm"
                            disabled={!isStockModified || isUpdating}
                            onClick={() => handleUpdateStock(product.id)}
                            className={`h-8 px-3 rounded-lg text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                              isStockModified
                                ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-xs'
                                : 'bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-600'
                            }`}
                          >
                            {isUpdating ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              'Update'
                            )}
                          </Button>
                        </div>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleOpenForm(product)}
                            className="h-8 w-8 rounded-lg cursor-pointer"
                            title="Edit Product"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
                                title="Delete Product"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete this product?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to permanently delete &quot;{product.name}&quot;?
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteProduct(product.id)}
                                  className="bg-red-600 hover:bg-red-700 text-white"
                                >
                                  Delete Product
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
};

export default ProductsPage;
