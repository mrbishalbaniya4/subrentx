'use client';

import React, { useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowLeft, ShoppingBag } from 'lucide-react';
import { Header } from '@/components/header';
import { ProductList } from '@/components/products/product-list';
import type { Item } from '@/lib/types';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function ProductsPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const itemsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    // Sort by creation date by default
    return query(collection(firestore, 'users', user.uid, 'items'), orderBy('createdAt', 'desc'));
  }, [firestore, user]);

  const { data: items, isLoading: areItemsLoading } = useCollection<Item>(itemsQuery);

  if (isUserLoading || (!items && areItemsLoading)) {
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
                Products
            </h1>
        </div>
      </header>
      <main className="flex-1 overflow-auto p-4 md:p-6">
        <ProductList items={items || []} />
      </main>
    </div>
  );
}
