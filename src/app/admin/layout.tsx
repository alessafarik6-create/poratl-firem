"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { BizForgeSidebar } from "@/components/layout/bizforge-sidebar";
import { TopHeader } from "@/components/layout/top-header";

type AdminSession = {
  username: string;
  role: string;
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [session, setSession] = useState<AdminSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    if (pathname === "/admin/login") {
      setLoading(false);
      return;
    }

    const checkSession = async () => {
      try {
        const fetchOnce = async () => {
          const res = await fetch("/api/superadmin/session", {
            method: "GET",
            credentials: "include",
            cache: "no-store",
            headers: {
              Accept: "application/json",
            },
          });
          return res;
        };

        console.debug("[AdminLayout] checking session", {
          pathname,
          userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "ssr",
        });

        let res = await fetchOnce();
        if (cancelled) return;

        // Mobile browsers can be slightly slower to persist cookies from the
        // previous navigation. Retry once for 401/unauthorized responses.
        if (!res.ok && res.status === 401) {
          console.warn("[AdminLayout] session unauthorized (401), retrying once after grace", {
            pathname,
          });
          await new Promise((r) => setTimeout(r, 800));
          res = await fetchOnce();
          if (cancelled) return;
        }

        if (!res.ok) {
          console.warn("[AdminLayout] session invalid, redirecting to /admin/login", {
            pathname,
            status: res.status,
          });
          setSession(null);
          window.location.replace("/admin/login");
          return;
        }

        const data = (await res.json()) as AdminSession;

        if (cancelled) return;

        if (!data?.username) {
          console.warn("[AdminLayout] session missing username, redirecting", {
            pathname,
            data,
          });
          setSession(null);
          window.location.replace("/admin/login");
          return;
        }

        console.debug("[AdminLayout] session ok", {
          pathname,
          username: data.username,
          role: data.role,
        });
        setSession(data);
      } catch (error) {
        console.error("[AdminLayout] session check failed", error);

        if (cancelled) return;

        setSession(null);
        window.location.replace("/admin/login");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    checkSession();

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm font-medium text-slate-600">
            Ověřování oprávnění...
          </p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-900">
      <BizForgeSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopHeader />
        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}