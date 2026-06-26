'use client';

import React from 'react';
import { useFirestore, useCollection, useMemoFirebase, deleteDocumentNonBlocking } from '@/firebase';
import { collection, doc, addDoc, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { format } from 'date-fns';
import type { User } from '@/app/admin/users/page';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface Order {
  id: string;
  userId: string;
  total: number;
  status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: { toDate: () => Date };
  userName?: string;
  userEmail?: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
}

type SortOption = 'date_desc' | 'date_asc' | 'status_asc' | 'status_desc';

const STATUS_SORT_ORDER: Order['status'][] = ['paid', 'shipped', 'delivered', 'cancelled'];

const OrdersPage = () => {
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [allOrders, setAllOrders] = React.useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = React.useState<Order[]>([]);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(true);
  const [sortOption, setSortOption] = React.useState<SortOption>('date_desc');
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [newOrderUserId, setNewOrderUserId] = React.useState<string>('');
  const [newOrderTotal, setNewOrderTotal] = React.useState<string>('');
  const [newOrderProductId, setNewOrderProductId] = React.useState<string>('none');
    const [isAddingOrder, setIsAddingOrder] = React.useState(false);

  // Safe date helper for cached items/Timestamps
  const parseDate = (dateObj) => {
    if (!dateObj) return new Date(0);
    if (typeof dateObj.toDate === 'function') return dateObj.toDate();
    if (dateObj.seconds !== undefined) return new Date(dateObj.seconds * 1000);
    return new Date(dateObj);
  };

  // Load from localStorage cache immediately on client-side mount
  React.useEffect(() => {
    try {
      const cached = localStorage.getItem('ez_admin_orders_cache');
      if (cached) {
        setAllOrders(JSON.parse(cached));
        setIsLoading(false);
      }
    } catch (e) {
      console.error("Error loading orders cache:", e);
    }
  }, []);

  const usersQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'users') : null),
    [firestore]
  );
  const { data: allUsers } = useCollection<User>(usersQuery);

  const productsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'products') : null),
    [firestore]
  );
  const { data: allProducts } = useCollection<Product>(productsQuery);


    React.useEffect(() => {
    if (allUsers && firestore) {
      const fetchAllOrders = async () => {
        setIsLoading(true);
        try {
          // Fetch orders for all users in parallel
          const promises = allUsers.map(async (user) => {
            const ordersRef = collection(firestore, 'users', user.id, 'orders');
            const orderSnap = await import('firebase/firestore').then(m => m.getDocs(ordersRef));
            const userOrders = [];
            orderSnap.forEach(doc => {
              const orderData = doc.data();
              if (orderData.createdAt) {
                 userOrders.push({
                   ...orderData,
                   id: doc.id,
                   userName: user.displayName,
                   userEmail: user.email,
                 });
              }
            });
            return userOrders;
          });

          const results = await Promise.all(promises);
          const aggregatedOrders = results.flat();
          
          setAllOrders(aggregatedOrders);
          try {
            localStorage.setItem('ez_admin_orders_cache', JSON.stringify(aggregatedOrders));
          } catch (e) {
            console.error("Error saving orders cache:", e);
          }
        } catch (err) {
          console.error("Error fetching all orders in parallel:", err);
        } finally {
          setIsLoading(false);
        }
      }
      fetchAllOrders();
    }
  }, [allUsers, firestore]);

  React.useEffect(() => {
    const lowercasedQuery = searchQuery.toLowerCase();
    let filtered = allOrders.filter((order) => {
      return (
        order.id.toLowerCase().includes(lowercasedQuery) ||
        (order.userName && order.userName.toLowerCase().includes(lowercasedQuery)) ||
        (order.userEmail && order.userEmail.toLowerCase().includes(lowercasedQuery)) ||
        order.status.toLowerCase().includes(lowercasedQuery) ||
        order.userId.toLowerCase().includes(lowercasedQuery)
      );
    });

    // Apply sorting
    switch (sortOption) {
        case 'date_asc':
            filtered.sort((a, b) => parseDate(a.createdAt).getTime() - parseDate(b.createdAt).getTime());
            break;
        case 'status_asc':
            filtered.sort((a, b) => {
                const aIndex = STATUS_SORT_ORDER.indexOf(a.status);
                const bIndex = STATUS_SORT_ORDER.indexOf(b.status);
                return aIndex - bIndex;
            });
            break;
        case 'status_desc':
            filtered.sort((a, b) => {
                const aIndex = STATUS_SORT_ORDER.indexOf(a.status);
                const bIndex = STATUS_SORT_ORDER.indexOf(b.status);
                return bIndex - aIndex;
            });
            break;
        case 'date_desc':
        default:
            filtered.sort((a, b) => parseDate(b.createdAt).getTime() - parseDate(a.createdAt).getTime());
            break;
    }

    setFilteredOrders(filtered);
  }, [searchQuery, allOrders, sortOption]);

  const handleAddOfflineOrder = async () => {
    if (!firestore || !newOrderUserId || !newOrderTotal || isNaN(Number(newOrderTotal))) {
        toast({ title: 'Please select a user and enter a valid total', variant: 'destructive' });
        return;
    }
    setIsAddingOrder(true);
    try {
        const orderData = {
            userId: newOrderUserId,
            total: Number(newOrderTotal),
            status: 'paid',
            createdAt: Timestamp.now(),
            isOfflineOrder: true,
        };
        const docRef = await addDoc(collection(firestore, 'users', newOrderUserId, 'orders'), orderData);
        
        if (newOrderProductId !== 'none') {
            const selectedProduct = allProducts?.find(p => p.id === newOrderProductId);
            if (selectedProduct) {
                const itemData = {
                    name: selectedProduct.name,
                    price: selectedProduct.price, // Or we could use newOrderTotal, but product price is fine
                    quantity: 1,
                    image: selectedProduct.image,
                };
                await addDoc(collection(firestore, 'users', newOrderUserId, 'orders', docRef.id, 'items'), itemData);
            }
        }
        
        // Optimistically update UI
        const selectedUser = allUsers?.find(u => u.id === newOrderUserId);
        const newOrder: Order = {
            id: docRef.id,
            userId: newOrderUserId,
            total: Number(newOrderTotal),
            status: 'paid',
            createdAt: Timestamp.now() as any,
            userName: selectedUser?.displayName,
            userEmail: selectedUser?.email,
        };
        setAllOrders(prev => [newOrder, ...prev]);

        toast({ title: 'Offline Order Added Successfully' });
        setIsAddModalOpen(false);
        setNewOrderUserId('');
        setNewOrderTotal('');
        setNewOrderProductId('none');
    } catch (error) {
        console.error("Error adding offline order:", error);
        toast({ title: 'Error adding order', variant: 'destructive' });
    } finally {
        setIsAddingOrder(false);
    }
  };

  const handleRowClick = (order: Order) => {
    router.push(`/admin/orders/${order.id}?userId=${order.userId}`);
  };

  const handleDeleteOrder = (e: React.MouseEvent, order: Order) => {
    e.stopPropagation(); // Prevent navigating to order details
    if (!firestore) return;
    
    const orderRef = doc(firestore, 'users', order.userId, 'orders', order.id);
    deleteDocumentNonBlocking(orderRef);
    
    // Update local state to reflect deletion instantly
    setAllOrders(prev => prev.filter(o => o.id !== order.id));
    
    toast({
      title: "Order Deleted",
      description: `Order ${order.id.substring(0, 7)} has been removed.`,
    });
  };

  return (
      <div className="space-y-8">
        <h1 className="text-3xl font-bold">Order Management</h1>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
                <CardTitle>All Orders</CardTitle>
                <Button onClick={() => setIsAddModalOpen(true)}>Add Offline Order</Button>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 mt-4">
                <div className="flex-1">
                  <Label htmlFor="search-orders" className="sr-only">Search Orders</Label>
                  <Input
                    id="search-orders"
                    placeholder="Search by Order ID, Name, Email, Status..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="max-w-md"
                  />
                </div>
                 <div className="flex items-center gap-2">
                    <Label htmlFor="sort-orders" className="shrink-0">Sort By:</Label>
                    <Select value={sortOption} onValueChange={(value) => setSortOption(value as SortOption)}>
                        <SelectTrigger className="w-[180px]" id="sort-orders">
                            <SelectValue placeholder="Sort orders" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="date_desc">Newest First</SelectItem>
                            <SelectItem value="date_asc">Oldest First</SelectItem>
                            <SelectItem value="status_asc">Status (A-Z)</SelectItem>
                            <SelectItem value="status_desc">Status (Z-A)</SelectItem>
                        </SelectContent>
                    </Select>
                 </div>
              </div>
          </CardHeader>
          <CardContent>
            {/* Table for larger screens */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && <TableRow><TableCell colSpan={6} className="text-center">Loading orders...</TableCell></TableRow>}
                  {!isLoading && filteredOrders.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={6} className="text-center">
                          {searchQuery ? 'No orders match your search.' : 'No orders found.'}
                        </TableCell>
                      </TableRow>
                  )}
                  {!isLoading && filteredOrders.map((order) => (
                    <TableRow key={order.id} onClick={() => handleRowClick(order)} className="cursor-pointer">
                      <TableCell className="font-mono text-xs">{order.id}</TableCell>
                      <TableCell>
                        <div className="font-medium">{order.userName}</div>
                        <div className="text-sm text-muted-foreground">{order.userEmail}</div>
                      </TableCell>
                      <TableCell>
                        {order.createdAt ? format(parseDate(order.createdAt), 'PPP p') : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={order.status === 'paid' ? 'default' : 'secondary'} className="capitalize">{order.status}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">₹{order.total.toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={(e) => e.stopPropagation()}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Order?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete order <strong>{order.id.substring(0, 7)}</strong>? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={(e) => handleDeleteOrder(e as any, order)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Delete Order
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            {/* Cards for smaller screens */}
            <div className="grid gap-4 md:hidden">
              {isLoading && <p className="text-center text-muted-foreground">Loading orders...</p>}
              {!isLoading && filteredOrders.length === 0 && (
                 <p className="text-center text-muted-foreground py-8">
                    {searchQuery ? 'No orders match your search.' : 'No orders found.'}
                  </p>
              )}
               {!isLoading && filteredOrders.map((order) => (
                  <Card key={order.id} onClick={() => handleRowClick(order)}>
                    <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">{order.userName}</CardTitle>
                            <CardDescription className="text-xs font-mono">{order.id}</CardDescription>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <Badge variant={order.status === 'paid' ? 'default' : 'secondary'} className="capitalize">{order.status}</Badge>
                             <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-destructive" onClick={(e) => e.stopPropagation()}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Order?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Permanently remove order {order.id.substring(0, 7)}?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={(e) => handleDeleteOrder(e as any, order)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Total</span>
                          <span className="font-bold text-lg">₹{order.total.toLocaleString()}</span>
                      </div>
                    </CardContent>
                     <CardFooter className="text-xs text-muted-foreground">
                        {order.createdAt ? format(parseDate(order.createdAt), 'PPP p') : 'N/A'}
                    </CardFooter>
                  </Card>
               ))}
            </div>

          </CardContent>
        </Card>

        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add Manual Offline Order</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Select User</Label>
                        <Select value={newOrderUserId} onValueChange={setNewOrderUserId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a customer" />
                            </SelectTrigger>
                            <SelectContent className="max-h-64">
                                {allUsers?.map((user) => (
                                    <SelectItem key={user.id} value={user.id}>
                                        {user.displayName || user.email || user.id} {user.email ? `(${user.email})` : ''}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Select Product</Label>
                        <Select 
                            value={newOrderProductId} 
                            onValueChange={(val) => {
                                setNewOrderProductId(val);
                                if (val !== 'none') {
                                    const prod = allProducts?.find(p => p.id === val);
                                    if (prod) setNewOrderTotal(prod.price.toString());
                                }
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select a product (Optional)" />
                            </SelectTrigger>
                            <SelectContent className="max-h-64">
                                <SelectItem value="none">None (Custom Order)</SelectItem>
                                {allProducts?.map((prod) => (
                                    <SelectItem key={prod.id} value={prod.id}>
                                        {prod.name} (₹{prod.price})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Order Total (₹)</Label>
                        <Input 
                            type="number" 
                            placeholder="Enter total amount" 
                            value={newOrderTotal}
                            onChange={(e) => setNewOrderTotal(e.target.value)}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
                    <Button onClick={handleAddOfflineOrder} disabled={isAddingOrder}>
                        {isAddingOrder ? "Adding..." : "Add Order"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

      </div>
  );
};

export default OrdersPage;
