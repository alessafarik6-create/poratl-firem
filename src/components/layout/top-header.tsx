
"use client";

import React from 'react';
import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Bell, Search, LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { signOut } from 'firebase/auth';
import { doc } from 'firebase/firestore';

export const TopHeader = () => {
  const auth = useAuth();
  const { user } = useUser();
  const firestore = useFirestore();

  const userRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [firestore, user]);
  const { data: profile } = useDoc(userRef);

  const getRoleLabel = (role?: string) => {
    if (!role) return 'Uživatel';
    const roles: Record<string, string> = {
      'super_admin': 'Super Administrátor',
      'billing_admin': 'Správce Fakturace',
      'owner': 'Vlastník',
      'admin': 'Administrátor',
      'manager': 'Manažer',
      'accountant': 'Účetní',
      'employee': 'Zaměstnanec'
    };
    return roles[role] || role;
  };

  return (
    <header className="h-16 border-b bg-background/50 backdrop-blur-sm sticky top-0 z-40 flex items-center justify-between px-8">
      <div className="relative w-96 max-w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input 
          placeholder="Hledat..." 
          className="pl-10 bg-surface/50 border-border focus-visible:ring-primary h-9"
        />
      </div>

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="relative text-muted-foreground">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full"></span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-3 px-2 hover:bg-surface transition-colors">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium leading-none">{profile?.displayName || user?.email}</p>
                <p className="text-xs text-muted-foreground mt-1 capitalize">
                  {getRoleLabel(profile?.globalRoles?.[0])}
                </p>
              </div>
              <Avatar className="h-9 w-9 border-2 border-primary/20">
                <AvatarImage src={profile?.photoUrl} />
                <AvatarFallback className="bg-primary text-white font-bold">
                  {(profile?.displayName?.[0] || user?.email?.[0] || 'U').toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-surface">
            <DropdownMenuLabel>Můj účet</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer">
              <User className="w-4 h-4 mr-2" /> Profil
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer text-destructive" onClick={() => signOut(auth)}>
              <LogOut className="w-4 h-4 mr-2" /> Odhlásit se
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
