'use client';

import { useAuth } from '@/lib/auth-context';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Menu } from 'lucide-react';

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const { user } = useAuth();
  const initials = (user?.name || user?.email || '?')[0].toUpperCase();

  return (
    <header className="sticky top-0 z-20 h-16 bg-white/80 backdrop-blur border-b border-neutral-200 flex items-center px-4 sm:px-6 lg:px-8 gap-4">
      <button className="lg:hidden text-neutral-700" onClick={onMenu}>
        <Menu className="h-5 w-5" />
      </button>
      <div className="flex-1" />
      <div className="flex items-center gap-3">
        <span className="hidden sm:block text-sm text-neutral-500">{user?.name || user?.email}</span>
        <Avatar className="h-9 w-9 border border-neutral-200">
          <AvatarFallback className="bg-black text-white">{initials}</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
