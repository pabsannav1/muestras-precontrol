"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ENLACES = [
  { href: "/admin", label: "Panel", exacto: true },
  { href: "/admin/partes", label: "Partes" },
  { href: "/admin/clientes", label: "Clientes" },
];

export function NavAdmin() {
  const path = usePathname();
  return (
    <nav className="flex gap-1">
      {ENLACES.map((e) => {
        const activo = e.exacto ? path === e.href : path.startsWith(e.href);
        return (
          <Link
            key={e.href}
            href={e.href}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium",
              activo ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {e.label}
          </Link>
        );
      })}
    </nav>
  );
}
