
'use client';

import React from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Users, ShoppingBag, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { User } from '@/app/admin/users/page';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';


interface Order {
  id: string;
  userId: string;
  total: number;
  status: string;
  createdAt: { toDate: () => Date };
  userName?: string;
  userEmail?: string;
}

const AdminDashboardPage = () => {
  const firestore = useFirestore();

  const usersQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'users') : null),
    [firestore]
  );
  const { data: users, isLoading: isLoadingUsers } = useCollection(usersQuery);

  const allUsersQuery = useMemoFirebase(
    () => firestore ? query(collection(firestore, 'users')) : null,
    [firestore]
  );
  
  const { data: allUsersWithOrders, isLoading: isLoadingOrders } = useCollection<User>(allUsersQuery);
  
  const [allOrders, setAllOrders] = React.useState<Order[]>([]);
  const [isAggregatingOrders, setIsAggregatingOrders] = React.useState(true);

  React.useEffect(() => {
    if (allUsersWithOrders && firestore) {
      const fetchAllOrders = async () => {
        setIsAggregatingOrders(true);
        let aggregatedOrders: Order[] = [];
        for (const u of allUsersWithOrders) {
           const ordersRef = collection(firestore, 'users', u.id, 'orders');
           const q = query(ordersRef, orderBy('createdAt', 'desc'), limit(10));
           const orderSnap = await import('firebase/firestore').then(m => m.getDocs(q));
           orderSnap.forEach(doc => {
             aggregatedOrders.push({
                id: doc.id,
                ...(doc.data() as Omit<Order, 'id'>),
                userName: u.displayName,
                userEmail: u.email
             });
           });
        }
        aggregatedOrders.sort((a, b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime());
        setAllOrders(aggregatedOrders);
        setIsAggregatingOrders(false);
      }
      fetchAllOrders();
    }
  }, [allUsersWithOrders, firestore]);


  const totalRevenue = allOrders.reduce((acc, order) => acc + order.total, 0);
  const totalOrders = allOrders.length;
  const totalUsers = users?.length ?? 0;
  const recentOrders = allOrders.slice(0, 5);

  const isLoading = isLoadingUsers || isAggregatingOrders;

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '...' : `₹${totalRevenue.toLocaleString()}`}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '...' : totalOrders}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '...' : totalUsers}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Table for larger screens */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && <TableRow><TableCell colSpan={4} className="text-center">Loading recent orders...</TableCell></TableRow>}
                {!isLoading && recentOrders.length === 0 && <TableRow><TableCell colSpan={4} className="text-center">No orders found.</TableCell></TableRow>}
                {!isLoading && recentOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <div className="font-medium max-w-[200px] truncate">{order.userName}</div>
                      <div className="text-sm text-muted-foreground max-w-[200px] truncate">{order.userEmail}</div>
                    </TableCell>
                    <TableCell>
                      {order.createdAt ? format(order.createdAt.toDate(), 'PPP') : 'N/A'}
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
            {isLoading && <p className="text-center text-muted-foreground">Loading recent orders...</p>}
            {!isLoading && recentOrders.length === 0 && <p className="text-center text-muted-foreground py-8">No orders found.</p>}
            {!isLoading && recentOrders.map((order) => (
              <Card key={order.id}>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="text-base">{order.userName}</CardTitle>
                            <CardDescription>{order.userEmail}</CardDescription>
                        </div>
                        <Badge variant={order.status === 'paid' ? 'default' : 'secondary'} className="capitalize">{order.status}</Badge>
                    </div>
                </CardHeader>
                <CardContent className="flex justify-between items-center text-sm">
                    <div className="text-muted-foreground">
                        {order.createdAt ? format(order.createdAt.toDate(), 'PPP') : 'N/A'}
                    </div>
                    <div className="font-bold">₹{order.total.toLocaleString()}</div>
                </CardContent>
              </Card>
            ))}
          </div>

        </CardContent>
        <CardFooter className="justify-center border-t p-4">
            <Button asChild variant="ghost" size="sm">
                <Link href="/admin/orders">View All Orders <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default AdminDashboardPage;

    