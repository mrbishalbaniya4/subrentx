'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

// This is now a redirect component.
// The main content has been moved to /rental/page.tsx
export default function HomeRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/rental');
  }, [router]);

  return (
    <div className="flex min-h-screen w-full items-center justify-center">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
    </div>
  );
}
