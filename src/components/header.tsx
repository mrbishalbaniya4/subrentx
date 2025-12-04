import { AddItemButton } from '@/components/kanban/add-item-button';
import { SubrentxLogo } from '@/components/icons/vaultbox-logo';
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
import Link from 'next/link';

interface HeaderProps {
  pageTitle: string;
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
  itemType: 'master' | 'assigned' | 'summary';
  hideControls?: boolean;
}

export function Header({
  pageTitle,
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
  isClient,
  itemType,
  hideControls = false
}: HeaderProps) {
  const { user } = useUser();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b bg-background p-4 md:h-auto md:border-0 md:bg-transparent md:px-6">
        <h1 className="text-lg font-semibold md:text-xl">
            {pageTitle}
        </h1>
        
        {user && isClient && !hideControls && (
           <div className="hidden w-full flex-col items-center gap-2 md:ml-auto md:flex md:w-auto md:flex-row">
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
                        <SelectItem value="Apeuni">Apeuni</SelectItem>
                        <SelectItem value="Netflix">Netflix</SelectItem>
                        <SelectItem value="Amazon">Amazon</SelectItem>
                        <SelectItem value="Spotify">Spotify</SelectItem>
                        <SelectItem value="Hulu">Hulu</SelectItem>
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
                    className={cn('h-8 w-8', viewMode === 'kanban' && 'shadow-sm')}
                  >
                    <KanbanSquare className="h-4 w-4 md:h-5 md:w-5" />
                    <span className="sr-only">Kanban View</span>
                  </Button>
                  <Button
                    variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                    size="icon"
                    onClick={() => onViewModeChange('grid')}
                     className={cn('h-8 w-8', viewMode === 'grid' && 'shadow-sm')}
                  >
                    <LayoutGrid className="h-4 w-4 md:h-5 md:w-5" />
                    <span className="sr-only">Grid View</span>
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                    size="icon"
                    onClick={() => onViewModeChange('list')}
                     className={cn('h-8 w-8', viewMode === 'list' && 'shadow-sm')}
                  >
                    <List className="h-4 w-4 md:h-5 md:w-5" />
                    <span className="sr-only">List View</span>
                  </Button>
                </div>
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          {user && !hideControls && itemType !== 'summary' && (
            <div className="hidden md:block">
              <AddItemButton itemType={itemType} />
            </div>
          )}
          {user && (
            <div className="md:hidden">
              <AddItemButton itemType={itemType} />
            </div>
          )}
          <UserNav />
        </div>
      </header>
  );
}
