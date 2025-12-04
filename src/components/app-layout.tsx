
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
  Plus,
  AreaChart,
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
import { AddItemButton } from './kanban/add-item-button';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';


export function AppLayout({
  children,
  pageTitle,
  itemType,
  hideControls = false,
}: {
  children: (props: {
    searchQuery: string;
    filterCategory: FilterCategory;
    filterUrgency: FilterUrgency;
    sortBy: SortByType;
    viewMode: ViewMode;
  }) => React.ReactNode;
  pageTitle: string;
  itemType: 'master' | 'assigned' | 'summary';
  hideControls?: boolean;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<FilterCategory>('all');
  const [filterUrgency, setFilterUrgency] = useState<FilterUrgency>('all');
  const [sortBy, setSortBy] = useState<SortByType>('createdAt');
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [isClient, setIsClient] = useState(false);
  const isMobile = useIsMobile();


  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <AppSidebar />
      <div className="flex flex-col md:pl-14">
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
        <div className="p-4 pb-24">
          {children({ searchQuery, filterCategory, filterUrgency, sortBy, viewMode })}
        </div>
      </div>
      {isClient && isMobile && <MobileBottomNav itemType={itemType} hideControls={hideControls} />}
    </div>
  );
}

function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-10 hidden w-14 flex-col border-r bg-background md:flex">
      <nav className="flex flex-col items-center gap-4 px-2 py-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={pathname === '/rental'}
              tooltip="Rentals"
            >
              <Link href="/rental">
                <LayoutDashboard />
                <span>Rentals</span>
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
              isActive={pathname === '/summary'}
              tooltip="Summary"
            >
              <Link href="/summary">
                <AreaChart />
                <span>Summary</span>
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
              isActive={pathname === '/profile'}
              tooltip="Profile"
            >
              <Link href="/profile">
                <Users />
                <span>Profile</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={pathname === '/settings'}
              tooltip="Settings"
            >
              <Link href="/settings">
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


function MobileBottomNav({ itemType, hideControls }: { itemType: 'master' | 'assigned' | 'summary'; hideControls?: boolean; }) {
  const pathname = usePathname();

  const navItems = [
    { href: '/rental', label: 'Rentals', icon: LayoutDashboard },
    { href: '/products', label: 'Products', icon: ShoppingBag },
    { href: '/activity-log', label: 'Activity', icon: History },
    { href: '/profile', label: 'Profile', icon: Users },
  ];

  return (
    <div className="fixed bottom-0 left-0 z-40 w-full border-t bg-background flex justify-around py-2">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            'group flex flex-col items-center justify-center gap-1 rounded-md p-2 text-sm font-medium w-1/4',
            pathname === item.href
              ? 'text-primary'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          <item.icon className="h-5 w-5" />
          <span className="text-xs">{item.label}</span>
        </Link>
      ))}
    </div>
  );
}
