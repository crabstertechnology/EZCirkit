
'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser as useAuthUser, useFirestore, useDoc, useCollection, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { doc, collection, query, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import Link from 'next/link';
import { ArrowLeft, Home } from 'lucide-react';
import type { User } from '@/app/admin/users/page';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
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
} from "@/components/ui/alert-dialog"
import type { Address } from '@/components/profile/address-card';

interface Order {
  id: string;
  total: number;
  status: string;
  createdAt: { toDate: () => Date };
}

const UserDetailsPage = () => {
  const { userId } = useParams();
  const { user: authUser } = useAuthUser(); // The currently logged-in admin
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const [isConfirmingRoleChange, setIsConfirmingRoleChange] = useState(false);
  const [nextAdminState, setNextAdminState] = useState<boolean | null>(null);

  const userDocRef = useMemoFirebase(
    () => (userId ? doc(firestore, 'users', userId as string) : null),
    [firestore, userId]
  );
  const { data: user, isLoading: isLoadingUser } = useDoc<User>(userDocRef);

  const ordersCollectionRef = useMemoFirebase(
    () => (userId ? query(collection(firestore, 'users', userId as string, 'orders'), orderBy('createdAt', 'desc')) : null),
    [firestore, userId]
  );
  const { data: orders, isLoading: isLoadingOrders } = useCollection<Order>(ordersCollectionRef);

  const addressesCollectionRef = useMemoFirebase(
    () => (userId ? collection(firestore, 'users', userId as string, 'addresses') : null),
    [firestore, userId]
  );
  const { data: addresses, isLoading: isLoadingAddresses } = useCollection<Address>(addressesCollectionRef);


  const isLoading = isLoadingUser || isLoadingOrders || isLoadingAddresses;

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length > 1) {
      return names[0][0] + names[names.length - 1][0];
    }
    return name.substring(0, 2);
  };
  
   const handleOrderClick = (order: Order) => {
    router.push(`/admin/orders/${order.id}?userId=${userId}`);
  };
  
  const handleRoleSwitchToggle = (isNowAdmin: boolean) => {
    if (!userDocRef || !user) return;
    
    if (authUser?.uid === userId) {
      toast({
        variant: 'destructive',
        title: 'Action Not Allowed',
        description: 'You cannot change your own role.',
      });
      return;
    }
    setNextAdminState(isNowAdmin);
    setIsConfirmingRoleChange(true);
  };
  
  const confirmRoleChange = () => {
    if (!userDocRef || !user || nextAdminState === null) return;
    
    updateDocumentNonBlocking(userDocRef, { isAdmin: nextAdminState });
    toast({
      title: 'User Role Updated',
      description: `${user?.displayName} is now ${nextAdminState ? 'an Admin' : 'a Customer'}.`,
    });
    
    setIsConfirmingRoleChange(false);
    setNextAdminState(null);
  };

  const cancelRoleChange = () => {
    setIsConfirmingRoleChange(false);
    setNextAdminState(null);
  }

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">Loading user details...</div>;
  }

  if (!user) {
    return (
      <div className="flex h-screen flex-col items-center justify-center text-center">
        <h1 className="text-2xl font-bold">User Not Found</h1>
        <p className="text-muted-foreground mt-2">Could not find details for this user.</p>
        <Link href="/admin/users" className="mt-4 text-sm text-blue-500 hover:underline">
          Back to Users
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
       <Link href="/admin/users" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-4 w-4" />
          Back to All Users
        </Link>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-8">
                <Card>
                    <CardHeader className="items-center text-center">
                        <Avatar className="w-24 h-24 mb-4">
                            <AvatarImage src={user.photoURL} alt={user.displayName} />
                            <AvatarFallback className="text-3xl">{getInitials(user.displayName)}</AvatarFallback>
                        </Avatar>
                        <CardTitle className="text-2xl">{user.displayName}</CardTitle>
                        <CardDescription>{user.email}</CardDescription>
                    </CardHeader>
                    <CardContent className="text-sm space-y-4">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">User ID</span>
                            <span className="font-mono text-xs break-all">{user.id}</span>
                        </div>
                         <div className="flex justify-between">
                            <span className="text-muted-foreground">Role</span>
                            {user.isAdmin ? <Badge>Admin</Badge> : <Badge variant="secondary">Customer</Badge>}
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Date Joined</span>
                            <span>{format(new Date(user.createdAt), 'PPP')}</span>
                        </div>
                    </CardContent>
                    <CardFooter className="flex-col items-start gap-4">
                        <Separator />
                        <div className="flex items-center justify-between w-full">
                            <Label htmlFor="admin-role" className={authUser?.uid === userId ? 'text-muted-foreground' : ''}>
                                {user.isAdmin ? 'Demote to Customer' : 'Promote to Admin'}
                            </Label>
                            <Switch
                                id="admin-role"
                                checked={user.isAdmin}
                                onCheckedChange={handleRoleSwitchToggle}
                                disabled={authUser?.uid === userId}
                            />
                        </div>
                        {authUser?.uid === userId && <p className="text-xs text-muted-foreground">You cannot change your own role.</p>}
                    </CardFooter>
                </Card>
            </div>
            <div className="lg:col-span-2 space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Order History</CardTitle>
                        <CardDescription>A list of all orders placed by this user.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Order ID</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {orders?.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center h-24">This user has not placed any orders.</TableCell>
                                    </TableRow>
                                )}
                                {orders?.map(order => (
                                    <TableRow key={order.id} onClick={() => handleOrderClick(order)} className="cursor-pointer">
                                        <TableCell className="font-mono text-xs">{order.id}</TableCell>
                                        <TableCell>{format(order.createdAt.toDate(), 'PPP')}</TableCell>
                                        <TableCell><Badge variant={order.status === 'paid' ? 'default' : 'secondary'} className="capitalize">{order.status}</Badge></TableCell>
                                        <TableCell className="text-right font-medium">₹{order.total.toLocaleString()}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Shipping Addresses</CardTitle>
                        <CardDescription>All saved shipping addresses for this user.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {addresses?.length === 0 && (
                            <p className="text-center text-sm text-muted-foreground h-24 flex items-center justify-center">This user has no saved addresses.</p>
                        )}
                        <div className="space-y-4">
                            {addresses?.map(address => (
                                <div key={address.id} className="border p-4 rounded-lg text-sm">
                                    <p className="font-semibold">{address.name}</p>
                                    <p className="text-muted-foreground">{address.phone}</p>
                                    <p className="text-muted-foreground mt-1">{address.addressLine1}</p>
                                    {address.addressLine2 && <p className="text-muted-foreground">{address.addressLine2}</p>}
                                    <p className="text-muted-foreground">
                                        {address.city}, {address.state} {address.postalCode}
                                    </p>
                                    <p className="text-muted-foreground">{address.country}</p>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>

        <AlertDialog open={isConfirmingRoleChange} onOpenChange={setIsConfirmingRoleChange}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will change the user's role. They will gain or lose administrative privileges.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={cancelRoleChange}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={confirmRoleChange}>
                  Confirm Change
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

    </div>
  );
};

export default UserDetailsPage;
