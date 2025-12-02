
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useCollection, useMemoFirebase, deleteDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { handleLogout } from '@/lib/auth';
import { useAuth } from '@/firebase';
import { collection, query, orderBy, limit, doc } from 'firebase/firestore';
import { format } from 'date-fns';
import { PlusCircle, Edit, Trash2, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import AddressForm from '@/components/profile/address-form';
import type { Address } from '@/components/profile/address-card';
import AddressCard from '@/components/profile/address-card';
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
} from "@/components/ui/alert-dialog"
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateProfile } from 'firebase/auth';
import Link from 'next/link';

export default function ProfilePage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isAddressFormOpen, setIsAddressFormOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [isSavingName, setIsSavingName] = useState(false);

  useEffect(() => {
    if (user?.displayName) {
      setDisplayName(user.displayName);
    }
  }, [user]);

  const ordersQuery = useMemoFirebase(
    () =>
      !isUserLoading && user
        ? query(collection(firestore, 'users', user.uid, 'orders'), orderBy('createdAt', 'desc'), limit(5))
        : null,
    [firestore, user, isUserLoading]
  );
  const { data: orders, isLoading: isLoadingOrders } = useCollection(ordersQuery);

  const addressesQuery = useMemoFirebase(
    () => (!isUserLoading && user ? collection(firestore, 'users', user.uid, 'addresses') : null),
    [firestore, user, isUserLoading]
  );
  const { data: addresses, isLoading: isLoadingAddresses } = useCollection<Address>(addressesQuery);

  React.useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length > 1) {
      return names[0][0] + names[names.length - 1][0];
    }
    return name.substring(0, 2);
  };
  
  const handleEditAddress = (address: Address) => {
    setEditingAddress(address);
    setIsAddressFormOpen(true);
  }
  
  const handleAddNewAddress = () => {
    setEditingAddress(null);
    setIsAddressFormOpen(true);
  }

  const handleDeleteAddress = (addressId: string) => {
    if (!user || !firestore) return;
    const addressRef = doc(firestore, 'users', user.uid, 'addresses', addressId);
    deleteDocumentNonBlocking(addressRef);
    toast({ title: "Address deleted successfully." });
  }

  const handleNameUpdate = async () => {
    if (!auth.currentUser || !firestore || !displayName) {
        toast({ variant: 'destructive', title: "Name cannot be empty." });
        return;
    }
    setIsSavingName(true);
    try {
        // Update Firebase Auth profile
        await updateProfile(auth.currentUser, { displayName });

        // Update Firestore user document
        const userRef = doc(firestore, 'users', auth.currentUser.uid);
        // Use non-blocking write with merge to preserve existing fields
        setDocumentNonBlocking(userRef, { displayName: displayName }, { merge: true });

        toast({ title: "Name updated successfully!" });

        // Force a re-render or state update if necessary, although onAuthStateChanged should handle it
        router.refresh(); 

    } catch (error) {
        console.error("Error updating name:", error);
        toast({ variant: 'destructive', title: "Error updating name." });
    } finally {
        setIsSavingName(false);
    }
  }


  if (isUserLoading || !user) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 md:px-6 py-24 md:py-32">
      <div className="grid md:grid-cols-3 gap-8">
        {/* Left Column: User Profile */}
        <div className="md:col-span-1 space-y-8">
          <Card>
            <CardHeader className="text-center">
              <Avatar className="w-24 h-24 mx-auto mb-4">
                <AvatarImage src={user.photoURL ?? ''} />
                <AvatarFallback className="text-3xl">
                  {getInitials(user.displayName)}
                </AvatarFallback>
              </Avatar>
              <CardTitle className="text-2xl">{displayName || 'User Profile'}</CardTitle>
              <CardDescription>{user.email}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid w-full max-w-sm items-center gap-1.5">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input 
                    type="text" 
                    id="displayName" 
                    placeholder="Enter your name" 
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                  <Button onClick={handleNameUpdate} disabled={isSavingName || displayName === user.displayName} className="mt-2">
                    {isSavingName ? 'Saving...' : 'Save Name'}
                  </Button>
              </div>
              <Button variant="destructive" className="w-full" onClick={() => handleLogout(auth).then(() => router.push('/'))}>
                Log Out
              </Button>
            </CardContent>
          </Card>
        </div>
        
        {/* Right Column: Orders and Addresses */}
        <div className="md:col-span-2 space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>My Orders</CardTitle>
              <CardDescription>View your recent order history.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingOrders && <p>Loading orders...</p>}
              {!isLoadingOrders && (!orders || orders.length === 0) && (
                <p>You haven't placed any orders yet.</p>
              )}
              <div className="space-y-4">
                {orders?.map(order => (
                   <Link href={`/order-confirmation/${order.id}`} key={order.id} className="block border p-4 rounded-lg hover:bg-secondary transition-colors">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold">Order #{order.id.substring(0, 7)}</p>
                        <p className="text-sm text-muted-foreground">
                          {order.createdAt && format(order.createdAt.toDate(), 'PPP')}
                        </p>
                      </div>
                       <div className="text-right flex items-center gap-4">
                         <div>
                            <p className="font-bold">₹{order.total.toLocaleString()}</p>
                            <p className="text-sm capitalize text-green-600">{order.status}</p>
                         </div>
                         <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </div>
                   </Link>
                ))}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>My Addresses</CardTitle>
                <CardDescription>Manage your shipping addresses.</CardDescription>
              </div>
               <Dialog open={isAddressFormOpen} onOpenChange={setIsAddressFormOpen}>
                <DialogTrigger asChild>
                  <Button onClick={handleAddNewAddress}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add New
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingAddress ? 'Edit Address' : 'Add a New Address'}</DialogTitle>
                  </DialogHeader>
                  <AddressForm
                    address={editingAddress}
                    onSave={() => {
                      setIsAddressFormOpen(false);
                      setEditingAddress(null);
                    }}
                  />
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="space-y-4">
               {isLoadingAddresses && <p>Loading addresses...</p>}
               {!isLoadingAddresses && (!addresses || addresses.length === 0) && (
                <p>You have no saved addresses.</p>
              )}
              {addresses?.map(address => (
                <div key={address.id} className="border p-4 rounded-lg flex justify-between items-start">
                   <AddressCard address={address} />
                   <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEditAddress(address)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                       <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete this address.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteAddress(address.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                   </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
