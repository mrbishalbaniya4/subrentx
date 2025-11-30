'use client';

import React, { Suspense } from 'react';
import { useUser } from '@/firebase';
import { KanbanWrapper } from '@/components/kanban/kanban-wrapper';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AddItemButton } from '@/components/kanban/add-item-button';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ShoppingBag } from 'lucide-react';

export default function ProductsPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  if (isUserLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin" />
      </div>
    );
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
            <Button variant="outline" size="icon" asChild>
            <Link href="/">
                <ArrowLeft />
                <span className="sr-only">Back to Home</span>
            </Link>
            </Button>
            <div className="flex items-center gap-2">
                <ShoppingBag className="h-6 w-6" />
                <h1 className="font-headline text-xl font-bold text-foreground">
                    Master Products
                </h1>
            </div>
            <div className="ml-auto">
                 <AddItemButton itemType="master" />
            </div>
        </header>
        <Suspense fallback={<div className="flex-1 p-6">Loading...</div>}>
            <KanbanWrapper user={user} itemType="master" />
        </Suspense>
    </div>
  );
}
