import { AddItemButton } from '@/components/kanban/add-item-button';
import { VaultboxLogo } from '@/components/icons/vaultbox-logo';
import { UserNav } from '@/components/user-nav';
import { useUser } from '@/firebase';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search } from 'lucide-react';
import type { FilterCategory, FilterUrgency, SortByType } from '@/lib/types';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filterCategory: FilterCategory;
  onFilterCategoryChange: (category: FilterCategory) => void;
  filterUrgency: FilterUrgency;
  onFilterUrgencyChange: (urgency: FilterUrgency) => void;
  sortBy: SortByType;
  onSortByChange: (sortBy: SortByType) => void;
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
  isClient
}: HeaderProps) {
  const { user } = useUser();

  return (
    <>
      <header className="sticky top-0 z-30 flex h-auto shrink-0 flex-col items-center gap-4 border-b bg-background/80 px-4 py-2 backdrop-blur-sm md:h-16 md:flex-row md:py-0 md:px-6">
        <div className="flex w-full flex-shrink-0 items-center gap-2 md:w-auto">
          <VaultboxLogo className="h-8 w-8 text-primary" />
          <h1 className="font-headline text-2xl font-bold text-foreground">
            VaultBox
          </h1>
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
          </div>
        )}

        <div className="ml-auto hidden items-center gap-2 md:flex">
          <UserNav />
        </div>
      </header>

      <div className="fixed bottom-4 right-4 z-40 flex flex-col items-center gap-3">
        {user && <AddItemButton />}
        <div className="flex gap-3 md:hidden">
            <UserNav />
        </div>
      </div>
    </>
  );
}