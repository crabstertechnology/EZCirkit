
'use client';

import React from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
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

interface Order {
  id: string;
  userId: string;
  total: number;
  status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: { toDate: () => Date };
  userName?: string;
  userEmail?: string;
}

type SortOption = 'date_desc' | 'date_asc' | 'status_asc' | 'status_desc';

const STATUS_SORT_ORDER: Order['status'][] = ['paid', 'shipped', 'delivered', 'cancelled'];

const OrdersPage = () => {
  const firestore = useFirestore();
  const router = useRouter();
  const [allOrders, setAllOrders] = React.useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = React.useState<Order[]>([]);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(true);
  const [sortOption, setSortOption] = React.useState<SortOption>('date_desc');

  const usersQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'users') : null),
    [firestore]
  );
  const { data: allUsers } = useCollection<User>(usersQuery);


  React.useEffect(() => {
    if (allUsers && firestore) {
      const fetchAllOrders = async () => {
        setIsLoading(true);
        let aggregatedOrders: Order[] = [];
        for (const user of allUsers) {
           const ordersRef = collection(firestore, 'users', user.id, 'orders');
           const orderSnap = await import('firebase/firestore').then(m => m.getDocs(ordersRef));
           orderSnap.forEach(doc => {
             const orderData = doc.data() as Omit<Order, 'id'>;
             if (orderData.createdAt) { // Guard against missing createdAt
                aggregatedOrders.push({
                  id: doc.id,
                  ...(orderData as Order),
                  userName: user.displayName,
                  userEmail: user.email,
                });
             }
           });
        }
        setAllOrders(aggregatedOrders);
        setIsLoading(false);
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
            filtered.sort((a, b) => a.createdAt.toDate().getTime() - b.createdAt.toDate().getTime());
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
            filtered.sort((a, b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime());
            break;
    }

    setFilteredOrders(filtered);
  }, [searchQuery, allOrders, sortOption]);

  const handleRowClick = (order: Order) => {
    router.push(`/admin/orders/${order.id}?userId=${order.userId}`);
  };

  return (
      <div className="space-y-8">
        <h1 className="text-3xl font-bold">Order Management</h1>
        <Card>
          <CardHeader>
            <CardTitle>All Orders</CardTitle>
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
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && <TableRow><TableCell colSpan={5} className="text-center">Loading orders...</TableCell></TableRow>}
                  {!isLoading && filteredOrders.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={5} className="text-center">
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
                        {order.createdAt ? format(order.createdAt.toDate(), 'PPP p') : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={order.status === 'paid' ? 'default' : 'secondary'} className="capitalize">{order.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">₹{order.total.toLocaleString()}</TableCell>
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
                          <Badge variant={order.status === 'paid' ? 'default' : 'secondary'} className="capitalize">{order.status}</Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Total</span>
                          <span className="font-bold text-lg">₹{order.total.toLocaleString()}</span>
                      </div>
                    </CardContent>
                     <CardFooter className="text-xs text-muted-foreground">
                        {order.createdAt ? format(order.createdAt.toDate(), 'PPP p') : 'N/A'}
                    </CardFooter>
                  </Card>
               ))}
            </div>

          </CardContent>
        </Card>
      </div>
  );
};

export default OrdersPage;
