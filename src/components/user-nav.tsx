'use client';

import {
  LogOut,
  User as UserIcon,
  LogIn,
  UserPlus,
  History,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useUser, useAuth } from '@/firebase';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { Skeleton } from '@/components/ui/skeleton';

export function UserNav() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (isUserLoading) {
    return <Skeleton className="h-12 w-12 rounded-full md:h-9 md:w-9" />;
  }

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={() => router.push('/login')}>
          <LogIn className="mr-2 h-4 w-4" />
          Login
        </Button>
        <Button onClick={() => router.push('/signup')}>
          <UserPlus className="mr-2 h-4 w-4" />
          Sign Up
        </Button>
      </div>
    );
  }

  const getInitials = (email: string | null | undefined) => {
    if (!email) return 'U';
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-12 w-12 rounded-full md:h-9 md:w-9">
          <Avatar className="h-12 w-12 md:h-9 md:w-9">
            <AvatarImage src={user.photoURL || undefined} alt="User avatar" />
            <AvatarFallback>{getInitials(user.email)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {user.displayName || 'User'}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => alert('Profile page coming soon!')}>
            <UserIcon className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </DropdownMenuItem>
           <DropdownMenuItem onClick={() => router.push('/activity-log')}>
            <History className="mr-2 h-4 w-4" />
            <span>Activity Log</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
