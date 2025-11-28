import { Header } from '@/components/header';
import { KanbanBoard } from '@/components/kanban/kanban-board';
import { getItems } from '@/app/items/actions';

export default async function Home() {
  const items = await getItems();

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header />
      <main className="flex-1 overflow-auto p-2 sm:p-4 md:p-6">
        <KanbanBoard initialItems={items} />
      </main>
    </div>
  );
}
