
'use client';

import React from 'react';
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy, doc } from 'firebase/firestore';
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
import { Switch } from '@/components/ui/switch';
import { Trash2 } from 'lucide-react';
import { format } from 'date-fns';
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
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  message: string;
  createdAt: { toDate: () => Date };
  read: boolean;
}

const MessagesPage = () => {
  const firestore = useFirestore();
  const { toast } = useToast();

  const messagesQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'contactMessages'), orderBy('createdAt', 'desc')) : null),
    [firestore]
  );
  const { data: messages, isLoading } = useCollection<ContactMessage>(messagesQuery);

  const handleToggleRead = (message: ContactMessage) => {
    if (!firestore) return;
    const messageRef = doc(firestore, 'contactMessages', message.id);
    updateDocumentNonBlocking(messageRef, { read: !message.read });
    toast({
      title: `Message marked as ${!message.read ? 'read' : 'unread'}.`,
    });
  };

  const handleDeleteMessage = (messageId: string) => {
    if (!firestore) return;
    const messageRef = doc(firestore, 'contactMessages', messageId);
    deleteDocumentNonBlocking(messageRef);
    toast({ title: 'Message deleted successfully.' });
  };
  
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Contact Messages</h1>
      <Card>
        <CardHeader>
          <CardTitle>Inbox</CardTitle>
          <CardDescription>View and manage messages from your users.</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Table for larger screens */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Sender</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Received</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && <TableRow><TableCell colSpan={5} className="text-center">Loading messages...</TableCell></TableRow>}
                {!isLoading && messages?.length === 0 && <TableRow><TableCell colSpan={5} className="text-center">No messages found.</TableCell></TableRow>}
                {!isLoading && messages?.map((message) => (
                  <TableRow key={message.id} className={!message.read ? 'bg-secondary/50' : ''}>
                    <TableCell>
                      <Badge variant={message.read ? 'secondary' : 'default'}>
                        {message.read ? 'Read' : 'Unread'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{message.name}</div>
                      <div className="text-sm text-muted-foreground">{message.email}</div>
                    </TableCell>
                    <TableCell>
                      <p className="max-w-md truncate">{message.message}</p>
                    </TableCell>
                    <TableCell>
                      {message.createdAt ? format(message.createdAt.toDate(), 'PPP p') : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end items-center gap-2">
                        <div className="flex items-center space-x-2">
                          <Switch
                            id={`read-switch-${message.id}`}
                            checked={message.read}
                            onCheckedChange={() => handleToggleRead(message)}
                            aria-label="Mark as read"
                          />
                          <label htmlFor={`read-switch-${message.id}`} className="text-sm sr-only">Read</label>
                        </div>
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
                                  This action cannot be undone. This will permanently delete this message.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteMessage(message.id)}>
                                  Delete Message
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
             {isLoading && <p className="text-center text-muted-foreground">Loading messages...</p>}
             {!isLoading && messages?.length === 0 && <p className="text-center text-muted-foreground">No messages found.</p>}
             {!isLoading && messages?.map((message) => (
                <Card key={message.id} className={!message.read ? 'bg-secondary/50 border-primary' : ''}>
                  <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{message.name}</CardTitle>
                          <CardDescription>{message.email}</CardDescription>
                        </div>
                         <Badge variant={message.read ? 'secondary' : 'default'}>
                          {message.read ? 'Read' : 'Unread'}
                        </Badge>
                      </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                     <p className="text-sm text-muted-foreground whitespace-pre-wrap">{message.message}</p>
                     <p className="text-xs text-muted-foreground pt-2 border-t">
                      Received: {message.createdAt ? format(message.createdAt.toDate(), 'PPP p') : 'N/A'}
                     </p>
                  </CardContent>
                  <CardFooter className="flex justify-end gap-2">
                      <div className="flex items-center space-x-2">
                          <Switch
                            id={`read-switch-mobile-${message.id}`}
                            checked={message.read}
                            onCheckedChange={() => handleToggleRead(message)}
                            aria-label="Mark as read"
                          />
                          <label htmlFor={`read-switch-mobile-${message.id}`} className="text-sm">Mark as Read</label>
                        </div>
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
                                This action cannot be undone. This will permanently delete this message.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteMessage(message.id)}>
                                Delete Message
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

export default MessagesPage;
