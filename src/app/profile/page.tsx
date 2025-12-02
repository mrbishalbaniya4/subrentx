'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { AppLayout } from '@/components/app-layout';
import { Loader2 } from 'lucide-react';
import { ProfileForm } from '@/components/profile/profile-form';
import { ChangePasswordForm } from '@/components/profile/change-password-form';
import { Separator } from '@/components/ui/separator';
import { AdminUserList } from '@/components/profile/admin-user-list';


function ProfileContent() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
  
    const userProfileRef = useMemoFirebase(() => {
      if (!user || !firestore) return null;
      return doc(firestore, 'users', user.uid);
    }, [user, firestore]);
  
    const {
      data: userProfile,
      isLoading: isProfileLoading,
      error,
    } = useDoc(userProfileRef);
  
    const canChangePassword = user?.providerData.some(
      (provider) => provider.providerId === 'password'
    );
    
    const isAdmin = user?.email === 'mrbishalbaniya4@gmail.com';
  
  
    if (isUserLoading || !user || isProfileLoading) {
      return (
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin" />
        </div>
      );
    }
  
    if (error) {
      return (
        <div className="flex h-full items-center justify-center">
          <p className="text-destructive">
            Error loading profile: {error.message}
          </p>
        </div>
      );
    }

    return (
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <div className="mx-auto max-w-2xl space-y-8">
            <ProfileForm userProfile={userProfile} />
            {canChangePassword && (
              <>
                <Separator />
                <ChangePasswordForm />
              </>
            )}
             {isAdmin && (
              <>
                <Separator />
                <AdminUserList />
              </>
            )}
          </div>
        </main>
    )
}


export default function ProfilePage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [isUserLoading, user, router]);

  if (isUserLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin" />
      </div>
    );
  }


  return (
    <AppLayout pageTitle="Profile" itemType="summary" hideControls>
      {() => <ProfileContent />}
    </AppLayout>
  );
}
