
'use client';

import React, { useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
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
import { PlusCircle, Trash2, Edit } from 'lucide-react';
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
import { Label } from '@/components/ui/label';

export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  description?: string;
  stock: number;
  image: string;
}

const ProductsPage = () => {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);


  const productsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'products') : null),
    [firestore]
  );
  const { data: products, isLoading } = useCollection<Product>(productsQuery);
  
  const [stockLevels, setStockLevels] = useState<Record<string, number | string>>({});

  React.useEffect(() => {
    if (products) {
      const initialStock = products.reduce((acc, product) => {
        acc[product.id] = product.stock;
        return acc;
      }, {} as Record<string, number>);
      setStockLevels(initialStock);
    }
  }, [products]);

  const handleStockChange = (productId: string, value: string) => {
    const newStock = value === '' ? '' : parseInt(value, 10);
    setStockLevels(prev => ({ ...prev, [productId]: isNaN(newStock as number) ? '' : newStock }));
  };

  const handleUpdateStock = (productId: string) => {
    if (!firestore) return;
    
    const newStock = stockLevels[productId];
    if (newStock === '' || newStock < 0) {
      toast({ variant: 'destructive', title: 'Invalid stock value.' });
      return;
    }

    const productDocRef = doc(firestore, 'products', productId);
    updateDoc(productDocRef, { stock: Number(newStock) })
      .then(() => {
        toast({ title: 'Stock updated successfully!' });
      })
      .catch((err) => {
         const permissionError = new FirestorePermissionError({
          path: productDocRef.path,
          operation: 'update',
          requestResourceData: { stock: Number(newStock) },
        });
        errorEmitter.emit('permission-error', permissionError);
      });
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
  }
  
  const handleOpenForm = (product: Product | null) => {
    setEditingProduct(product);
    setIsProductFormOpen(true);
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Product Management</h1>
         <Dialog open={isProductFormOpen} onOpenChange={setIsProductFormOpen}>
            <DialogTrigger asChild>
                <Button onClick={() => handleOpenForm(null)}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add New Product
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{editingProduct ? 'Edit Product' : 'Add a New Product'}</DialogTitle>
                </DialogHeader>
                <ProductForm onSave={() => setIsProductFormOpen(false)} product={editingProduct} />
            </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Products</CardTitle>
          <CardDescription>Update stock levels for products in your store.</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Table for larger screens */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Current Stock</TableHead>
                  <TableHead>New Stock</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && <TableRow><TableCell colSpan={4} className="text-center">Loading products...</TableCell></TableRow>}
                {!isLoading && products?.length === 0 && <TableRow><TableCell colSpan={4} className="text-center">No products found. Click 'Add New Product' to get started.</TableCell></TableRow>}
                {!isLoading && products?.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="flex items-center gap-4">
                        <Image src={product.image} alt={product.name} width={60} height={60} className="rounded-md object-cover" />
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-sm text-muted-foreground font-mono text-xs break-all">ID: {product.id}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {product.stock === 0 ? (
                          <Badge variant="destructive">Out of Stock</Badge>
                      ): (
                          <Badge variant="secondary">{product.stock}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        value={stockLevels[product.id] ?? ''}
                        onChange={(e) => handleStockChange(product.id, e.target.value)}
                        className="w-24"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          onClick={() => handleUpdateStock(product.id)}
                          disabled={Number(stockLevels[product.id]) === product.stock}
                        >
                          Update Stock
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => handleOpenForm(product)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="icon">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will permanently delete this product and all associated data.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteProduct(product.id)}>
                                  Delete Product
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {/* Cards for smaller screens */}
           <div className="grid gap-4 md:hidden">
              {isLoading && <p className="text-center text-muted-foreground">Loading products...</p>}
              {!isLoading && products?.length === 0 && <p className="text-center text-muted-foreground py-8">No products found.</p>}
              {!isLoading && products?.map((product) => (
                <Card key={product.id}>
                    <CardHeader>
                        <div className="flex items-center gap-4">
                          <Image src={product.image} alt={product.name} width={80} height={80} className="rounded-md object-cover" />
                          <div>
                            <CardTitle className="text-lg">{product.name}</CardTitle>
                            <CardDescription className="font-mono text-xs break-all">ID: {product.id}</CardDescription>
                            <div className="mt-2">
                              {product.stock === 0 ? (
                                <Badge variant="destructive">Out of Stock</Badge>
                              ) : (
                                <Badge variant="secondary">In Stock: {product.stock}</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <Label htmlFor={`stock-mobile-${product.id}`}>Update Stock</Label>
                        <Input
                          id={`stock-mobile-${product.id}`}
                          type="number"
                          min="0"
                          value={stockLevels[product.id] ?? ''}
                          onChange={(e) => handleStockChange(product.id, e.target.value)}
                        />
                    </CardContent>
                    <CardFooter className="flex justify-between">
                         <Button
                            onClick={() => handleUpdateStock(product.id)}
                            disabled={Number(stockLevels[product.id]) === product.stock}
                            className="flex-1"
                          >
                            Update Stock
                          </Button>
                          <Button variant="outline" size="icon" className="ml-2" onClick={() => handleOpenForm(product)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                           <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="icon" className="ml-2">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete this product.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteProduct(product.id)}>
                                    Delete Product
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                    </CardFooter>
                </Card>
              ))}
           </div>

        </CardContent>
      </Card>
    </div>
  );
};

export default ProductsPage;
