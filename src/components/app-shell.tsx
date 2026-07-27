"use client";

import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { BottomNav } from "@/components/bottom-nav";
import { SiteFooter } from "@/components/site-footer";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  return (
    <>
      <div className="flex-1">{children}</div>
      <div className={cn(user && "pb-16 sm:pb-0")}>
        <SiteFooter />
      </div>
      {user && <BottomNav />}
    </>
  );
}
