"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useUser } from '@/firebase';
import { BizForgeSidebar } from '@/components/layout/bizforge-sidebar';
import { TopHeader } from '@/components/layout/top-header';
import { getIdTokenResult } from 'firebase/auth';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    // Veřejná cesta pro přihlášení administrátora nevyžaduje kontrolu práv
    if (pathname === '/admin/login') {
      setIsAuthorized(true);
      return;
    }

    const verifyAdminAccess = async () => {
      if (!isUserLoading) {
        // 1. Kontrola, zda je uživatel vůbec přihlášen
        if (!user) {
          router.push('/admin/login');
          setIsAuthorized(false);
          return;
        }

        try {
          // 2. Kontrola custom claims pro ověření role super_admin
          // systemRole je nastaven v Firebase Auth custom claims
          const tokenResult = await getIdTokenResult(user);
          const hasSuperAdminClaim = tokenResult.claims.systemRole === 'super_admin';

          if (hasSuperAdminClaim) {
            setIsAuthorized(true);
          } else {
            // Uživatel je přihlášen (např. jako běžný zaměstnanec), ale nemá přístup do globálního adminu
            console.warn("Uživatel se pokusil o přístup do administrace bez systemRole claimu.");
            router.push('/admin/login');
            setIsAuthorized(false);
          }
        } catch (error) {
          console.error("Kritická chyba při ověřování administrátorských práv:", error);
          router.push('/admin/login');
          setIsAuthorized(false);
        }
      }
    };

    verifyAdminAccess();
  }, [user, isUserLoading, pathname, router]);

  // Zobrazení systémového loaderu během ověřování identity
  if (isUserLoading || isAuthorized === null) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <div className="space-y-1">
            <p className="text-white font-medium">Zabezpečený přístup</p>
            <p className="text-zinc-500 text-xs uppercase tracking-widest animate-pulse font-mono">Ověřování systémových oprávnění</p>
          </div>
        </div>
      </div>
    );
  }

  // Pokud jsme na login stránce, vykreslíme pouze obsah bez postranního panelu
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  // Standardní administrátorský layout s plnou navigací pro autorizované uživatele
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <BizForgeSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopHeader />
        <main className="flex-1 p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
