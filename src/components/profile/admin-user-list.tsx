'use client';

import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import type { Timestamp } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { updateUserStatus } from '@/firebase/firestore/mutations';
import { useTransition } from 'react';
import { useToast } from '@/hooks/use-toast';

type UserStatus = 'pending' | 'active' | 'suspended';

interface UserProfile {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    status: UserStatus;
    createdAt?: Timestamp;
}

const getInitials = (firstName?: string, lastName?: string, email?: string) => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    if (email) {
      return email.substring(0, 2).toUpperCase();
    }
    return 'U';
};

const statusColors: Record<UserStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  suspended: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

function UserActions({ user }: { user: UserProfile }) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const firestore = useFirestore();

  const handleUpdateStatus = (newStatus: UserStatus) => {
    if (!firestore) return;
    startTransition(async () => {
      try {
        await updateUserStatus(firestore, user.id, newStatus);
        toast({
          title: 'Success',
          description: `User status updated to ${newStatus}.`,
        });
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to update user status.',
        });
      }
    });
  };

  return (
    <div className="flex gap-2">
      {user.status === 'pending' && (
        <>
          <Button size="sm" onClick={() => handleUpdateStatus('active')} disabled={isPending} className="bg-green-600 hover:bg-green-700">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Approve'}
          </Button>
           <Button size="sm" variant="destructive" onClick={() => handleUpdateStatus('suspended')} disabled={isPending}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Reject'}
          </Button>
        </>
      )}
      {user.status === 'active' && user.email !== 'mrbishalbaniya4@gmail.com' && (
        <Button size="sm" variant="destructive" onClick={() => handleUpdateStatus('suspended')} disabled={isPending}>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Suspend'}
        </Button>
      )}
       {user.status === 'suspended' && (
        <Button size="sm" onClick={() => handleUpdateStatus('active')} disabled={isPending}>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Reactivate'}
        </Button>
      )}
    </div>
  );
}

export function AdminUserList() {
  const firestore = useFirestore();

  const usersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'users'), 
      orderBy('createdAt', 'desc'), 
      limit(100)
    );
  }, [firestore]);

  const { data: users, isLoading, error } = useCollection<UserProfile>(usersQuery);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-destructive">Error loading users: {error.message}</p>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Admin: All Users</CardTitle>
        <CardDescription>
          A list of all users who have signed up for the application.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Signed Up</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users && users.map(user => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback>
                        {getInitials(user.firstName, user.lastName, user.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid gap-0.5">
                      <p className="font-medium">
                        {user.firstName || 'N/A'} {user.lastName}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  {user.createdAt
                    ? formatDistanceToNow(user.createdAt.toDate(), { addSuffix: true })
                    : 'N/A'}
                </TableCell>
                <TableCell>
                   <Badge variant={user.email === 'mrbishalbaniya4@gmail.com' ? 'default' : 'secondary'}>
                        {user.email === 'mrbishalbaniya4@gmail.com' ? 'Admin' : 'User'}
                    </Badge>
                </TableCell>
                <TableCell>
                    <Badge className={cn(statusColors[user.status])}>
                        {user.status}
                    </Badge>
                </TableCell>
                <TableCell className="text-right">
                    <UserActions user={user} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
