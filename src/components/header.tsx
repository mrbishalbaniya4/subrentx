import { AddItemButton } from '@/components/kanban/add-item-button';
import { VaultboxLogo } from '@/components/icons/vaultbox-logo';
import { UserNav } from '@/components/user-nav';
import { useUser } from '@/firebase';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, LayoutGrid, List, KanbanSquare } from 'lucide-react';
import type { FilterCategory, FilterUrgency, SortByType, ViewMode } from '@/lib/types';
import { cn } from '@/lib/utils';
import { SidebarTrigger } from '@/components/ui/sidebar';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filterCategory: FilterCategory;
  onFilterCategoryChange: (category: FilterCategory) => void;
  filterUrgency: FilterUrgency;
  onFilterUrgencyChange: (urgency: FilterUrgency) => void;
  sortBy: SortByType;
  onSortByChange: (sortBy: SortByType) => void;
  viewMode: ViewMode;
  onViewModeChange: (viewMode: ViewMode) => void;
  isClient: boolean;
}

export function Header({
  searchQuery,
  onSearchChange,
  filterCategory,
  onFilterCategoryChange,
  filterUrgency,
  onFilterUrgencyChange,
  sortBy,
  onSortByChange,
  viewMode,
  onViewModeChange,
  isClient
}: HeaderProps) {
  const { user } = useUser();

  return (
    <>
      <header className="sticky top-0 z-30 flex h-auto shrink-0 flex-col items-center gap-4 border-b bg-background/80 px-4 py-2 backdrop-blur-sm md:h-16 md:flex-row md:py-0 md:px-6">
        <div className="flex w-full flex-shrink-0 items-center gap-2 md:w-auto">
          <SidebarTrigger className="md:hidden"/>
          <div className="hidden items-center gap-2 md:flex">
            <VaultboxLogo className="h-8 w-8 text-primary" />
            <h1 className="font-headline text-2xl font-bold text-foreground">
                VaultBox
            </h1>
          </div>
        </div>
        
        {user && isClient && (
           <div className="flex w-full flex-col items-center gap-2 md:ml-auto md:w-auto md:flex-row">
              <div className="relative w-full flex-1 md:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search items..."
                  className="w-full pl-9"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                />
              </div>

              <div className="flex w-full gap-2 md:w-auto">
                   <Select value={filterCategory} onValueChange={onFilterCategoryChange}>
                      <SelectTrigger className="w-full flex-1 md:w-[150px]">
                        <SelectValue placeholder="Filter by category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        <SelectItem value="Work">Work</SelectItem>
                        <SelectItem value="Personal">Personal</SelectItem>
                        <SelectItem value="Finance">Finance</SelectItem>
                        <SelectItem value="Shopping">Shopping</SelectItem>
                        <SelectItem value="Social">Social</SelectItem>
                        <SelectItem value="Travel">Travel</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={filterUrgency} onValueChange={onFilterUrgencyChange}>
                      <SelectTrigger className="w-full flex-1 md:w-[160px]">
                        <SelectValue placeholder="Filter by urgency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Urgencies</SelectItem>
                        <SelectItem value="soon-to-expire">Soon to Expire</SelectItem>
                        <SelectItem value="expired">Expired</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={sortBy} onValueChange={onSortByChange}>
                      <SelectTrigger className="w-full flex-1 md:w-[150px]">
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="createdAt">Recent</SelectItem>
                        <SelectItem value="alphabetical">Alphabetical</SelectItem>
                        <SelectItem value="endDate">End Date</SelectItem>
                      </SelectContent>
                    </Select>
              </div>

               <div className="hidden items-center gap-1 rounded-lg border bg-background p-1 md:flex">
                  <Button
                    variant={viewMode === 'kanban' ? 'secondary' : 'ghost'}
                    size="icon"
                    onClick={() => onViewModeChange('kanban')}
                    className={cn(viewMode === 'kanban' && 'shadow-sm')}
                  >
                    <KanbanSquare className="h-5 w-5" />
                    <span className="sr-only">Kanban View</span>
                  </Button>
                  <Button
                    variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                    size="icon"
                    onClick={() => onViewModeChange('grid')}
                     className={cn(viewMode === 'grid' && 'shadow-sm')}
                  >
                    <LayoutGrid className="h-5 w-5" />
                    <span className="sr-only">Grid View</span>
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                    size="icon"
                    onClick={() => onViewModeChange('list')}
                     className={cn(viewMode === 'list' && 'shadow-sm')}
                  >
                    <List className="h-5 w-5" />
                    <span className="sr-only">List View</span>
                  </Button>
                </div>
          </div>
        )}

        <div className="ml-auto hidden items-center gap-2 md:flex">
           <SidebarTrigger />
          <UserNav />
        </div>
      </header>
    </>
  );
}
