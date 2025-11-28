import { AddItemButton } from '@/components/kanban/add-item-button';
import { VaultboxLogo } from '@/components/icons/vaultbox-logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { UserNav } from '@/components/user-nav';
import { useUser } from '@/firebase';

export function Header() {
  const { user, isUserLoading } = useUser();

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
      <div className="flex items-center gap-2">
        <VaultboxLogo className="h-8 w-8 text-primary" />
        <h1 className="font-headline text-2xl font-bold text-foreground">
          VaultBox
        </h1>
      </div>
      <div className="ml-auto flex items-center gap-2">
        {user && <AddItemButton />}
        <UserNav />
        <ThemeToggle />
      </div>
    </header>
  );
}
