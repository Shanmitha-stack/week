import type { FC } from 'react';
import { Sparkles } from 'lucide-react';

const AppHeader: FC = () => {
  return (
    <header className="py-6 px-4 md:px-8 border-b bg-card shadow-sm">
      <div className="container mx-auto flex items-center gap-3">
        <Sparkles className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-headline font-bold text-foreground">Avatar Animation</h1>
      </div>
    </header>
  );
};
export default AppHeader;
