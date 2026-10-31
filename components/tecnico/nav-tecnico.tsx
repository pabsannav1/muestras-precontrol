"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, CheckCheck } from "lucide-react";
import { LogoutButton } from "@/components/logout-button";
import { cn } from "@/lib/utils";

export function NavTecnico({ nombre, color }: { nombre: string; color: string }) {
  const path = usePathname();
  const item = "flex flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium";
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className="mx-auto flex h-16 max-w-md">
        <Link href="/" className={cn(item, path === "/" || path.startsWith("/parte") ? "text-cyan-700" : "text-muted-foreground")}>
          <CalendarDays className="size-6" />
          Días
        </Link>
        <Link href="/hechos" className={cn(item, path.startsWith("/hechos") ? "text-cyan-700" : "text-muted-foreground")}>
          <CheckCheck className="size-6" />
          Hechos
        </Link>
        <div className={cn(item, "text-muted-foreground")}>
          <LogoutButton destino="/login" conTexto={false} className="flex-col" />
          <span className="flex max-w-20 items-center gap-1 truncate">
            <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
            {nombre}
          </span>
        </div>
      </div>
    </nav>
  );
}
