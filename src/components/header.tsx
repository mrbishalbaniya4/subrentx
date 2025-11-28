import { AddItemButton } from '@/components/kanban/add-item-button';
import { VaultboxLogo } from '@/components/icons/vaultbox-logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { UserNav } from '@/components/user-nav';
import { useUser } from '@/firebase';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}


export function Header({ searchQuery, onSearchChange }: HeaderProps) {
  const { user } = useUser();

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
      <div className="flex items-center gap-2">
        <VaultboxLogo className="h-8 w-8 text-primary" />
        <h1 className="font-headline text-2xl font-bold text-foreground">
          VaultBox
        </h1>
      </div>
      <div className="ml-auto flex w-full max-w-md items-center gap-2">
        {user && (
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search items..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        )}
        {user && <AddItemButton />}
        <UserNav />
        <ThemeToggle />
      </div>
    </header>
  );
}
