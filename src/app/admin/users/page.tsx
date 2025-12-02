
'use client';

import React from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';


export interface User {
  id: string;
  displayName: string;
  email: string;
  photoURL: string;
  createdAt: string;
  isAdmin: boolean;
}

type SortOption = 'role_desc' | 'date_desc' | 'date_asc' | 'name_asc' | 'name_desc';

const UsersPage = () => {
  const firestore = useFirestore();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = React.useState('');
  const [sortOption, setSortOption] = React.useState<SortOption>('role_desc');

  const usersQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'users') : null),
    [firestore]
  );
  const { data: users, isLoading } = useCollection<User>(usersQuery);

  const filteredAndSortedUsers = React.useMemo(() => {
    if (!users) return [];

    // Filter first
    const lowercasedQuery = searchQuery.toLowerCase();
    let filtered = users.filter(user =>
      user.displayName?.toLowerCase().includes(lowercasedQuery) ||
      user.email?.toLowerCase().includes(lowercasedQuery) ||
      (user.isAdmin && 'admin'.includes(lowercasedQuery)) ||
      (!user.isAdmin && 'customer'.includes(lowercasedQuery))
    );

    // Then sort
    switch (sortOption) {
      case 'date_asc':
        filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case 'name_asc':
        filtered.sort((a, b) => (a.displayName || '').localeCompare(b.displayName || ''));
        break;
      case 'name_desc':
        filtered.sort((a, b) => (b.displayName || '').localeCompare(a.displayName || ''));
        break;
      case 'date_desc':
         filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'role_desc':
      default:
        filtered.sort((a, b) => {
          if (a.isAdmin && !b.isAdmin) return -1;
          if (!a.isAdmin && b.isAdmin) return 1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        break;
    }

    return filtered;
  }, [users, searchQuery, sortOption]);


  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length > 1) {
      return names[0][0] + names[names.length - 1][0];
    }
    return name.substring(0, 2);
  };
  
  const handleRowClick = (userId: string) => {
    router.push(`/admin/users/${userId}`);
  };

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">User Management</h1>
      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>View, search, and manage all registered users.</CardDescription>
           <div className="flex flex-col sm:flex-row gap-4 mt-4">
                <div className="flex-1">
                  <Label htmlFor="search-users" className="sr-only">Search Users</Label>
                  <Input
                    id="search-users"
                    placeholder="Search by Name, Email, Role..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="max-w-md"
                  />
                </div>
                 <div className="flex items-center gap-2">
                    <Label htmlFor="sort-users" className="shrink-0">Sort By:</Label>
                    <Select value={sortOption} onValueChange={(value) => setSortOption(value as SortOption)}>
                        <SelectTrigger className="w-[180px]" id="sort-users">
                            <SelectValue placeholder="Sort users" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="role_desc">Role (Admins First)</SelectItem>
                            <SelectItem value="date_desc">Newest First</SelectItem>
                            <SelectItem value="date_asc">Oldest First</SelectItem>
                            <SelectItem value="name_asc">Name (A-Z)</SelectItem>
                            <SelectItem value="name_desc">Name (Z-A)</SelectItem>
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
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Date Joined</TableHead>
                  <TableHead>User ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && <TableRow><TableCell colSpan={5} className="text-center">Loading users...</TableCell></TableRow>}
                {!isLoading && filteredAndSortedUsers.length === 0 && <TableRow><TableCell colSpan={5} className="text-center">No users found.</TableCell></TableRow>}
                {!isLoading && filteredAndSortedUsers.map((user) => (
                  <TableRow key={user.id} onClick={() => handleRowClick(user.id)} className="cursor-pointer">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={user.photoURL} />
                          <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{user.displayName}</span>
                      </div>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      {user.isAdmin ? (
                        <Badge>Admin</Badge>
                      ) : (
                        <Badge variant="secondary">Customer</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.createdAt ? format(new Date(user.createdAt), 'PPP') : 'N/A'}
                    </TableCell>
                    <TableCell className="font-mono text-xs break-all">{user.id}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
           {/* Cards for smaller screens */}
          <div className="grid gap-4 md:hidden">
            {isLoading && <p className="text-center text-muted-foreground">Loading users...</p>}
            {!isLoading && filteredAndSortedUsers.length === 0 && <p className="text-center text-muted-foreground py-8">No users found.</p>}
            {!isLoading && filteredAndSortedUsers.map((user) => (
              <Card key={user.id} onClick={() => handleRowClick(user.id)}>
                 <CardHeader>
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={user.photoURL} />
                          <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
                        </Avatar>
                        <div>
                           <CardTitle className="text-base">{user.displayName}</CardTitle>
                           <CardDescription>{user.email}</CardDescription>
                        </div>
                      </div>
                       {user.isAdmin ? (
                          <Badge>Admin</Badge>
                        ) : (
                          <Badge variant="secondary">Customer</Badge>
                        )}
                    </div>
                 </CardHeader>
                 <CardContent className="text-xs text-muted-foreground">
                    Joined on {user.createdAt ? format(new Date(user.createdAt), 'PPP') : 'N/A'}
                 </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UsersPage;

    