'use client';

import React, { useState, useEffect } from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import Link from 'next/link';
import {
  Home,
  ShoppingBag,
  History,
  Settings,
  LayoutDashboard,
  Users,
} from 'lucide-react';
import { Header } from '@/components/header';
import { useUser } from '@/firebase';
import type {
  FilterCategory,
  FilterUrgency,
  SortByType,
  ViewMode,
} from '@/lib/types';
import { usePathname } from 'next/navigation';

export function AppLayout({
  children,
  pageTitle,
  itemType,
  hideControls = false,
}: {
  children: React.ReactNode;
  pageTitle: string;
  itemType: 'master' | 'assigned';
  hideControls?: boolean;
}) {
  const { user } = useUser();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<FilterCategory>('all');
  const [filterUrgency, setFilterUrgency] = useState<FilterUrgency>('all');
  const [sortBy, setSortBy] = useState<SortByType>('createdAt');
  const [viewMode, setViewMode] = useState<ViewMode>(
    itemType === 'master' ? 'list' : 'kanban'
  );
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <AppSidebar />
      <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">
        <Header
          pageTitle={pageTitle}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filterCategory={filterCategory}
          onFilterCategoryChange={setFilterCategory}
          filterUrgency={filterUrgency}
          onFilterUrgencyChange={setFilterUrgency}
          sortBy={sortBy}
          onSortByChange={setSortBy}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          isClient={isClient}
          itemType={itemType}
          hideControls={hideControls}
        />
        {React.cloneElement(children as React.ReactElement, {
          searchQuery,
          filterCategory,
          filterUrgency,
          sortBy,
          viewMode,
        })}
      </div>
    </div>
  );
}

function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-10 hidden w-14 flex-col border-r bg-background sm:flex">
      <nav className="flex flex-col items-center gap-4 px-2 py-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={pathname === '/'}
              tooltip="Dashboard"
            >
              <Link href="/">
                <LayoutDashboard />
                <span>Dashboard</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={pathname === '/products'}
              tooltip="Master Products"
            >
              <Link href="/products">
                <ShoppingBag />
                <span>Master Products</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={pathname === '/activity-log'}
              tooltip="Activity Log"
            >
              <Link href="/activity-log">
                <History />
                <span>Activity Log</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </nav>
      <nav className="mt-auto flex flex-col items-center gap-4 px-2 py-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={pathname === '/settings'}
              tooltip="Settings"
            >
              <Link href="#">
                <Settings />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </nav>
    </aside>
  );
}
