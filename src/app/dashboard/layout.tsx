
'use client';

import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarTrigger,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarInset,
} from '@/components/ui/sidebar';
import { VaultboxLogo } from '@/components/icons/vaultbox-logo';
import { UserNav } from '@/components/user-nav';
import { KanbanSquare, Settings } from 'lucide-react';
import { AddItemButton } from '@/components/kanban/add-item-button';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Header } from '@/components/header';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  if (isUserLoading || !user) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }


  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2">
             <VaultboxLogo className="h-8 w-8 text-primary" />
             <h1 className="font-headline text-2xl font-bold text-foreground">
                VaultBox
             </h1>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton href="/dashboard" isActive>
                <KanbanSquare />
                All Items
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
            <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton href="#">
                        <Settings />
                        Settings
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        {children}
        <div className="fixed bottom-4 right-4 z-40 flex flex-col items-center gap-3">
          {user && <AddItemButton />}
          <div className="flex gap-3 md:hidden">
            <UserNav />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
