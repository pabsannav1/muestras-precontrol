"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

export function LogoutButton({ destino, className, conTexto = true }: { destino: string; className?: string; conTexto?: boolean }) {
  const router = useRouter();
  async function salir() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace(destino);
    router.refresh();
  }
  return (
    <button type="button" onClick={salir} className={cn("inline-flex items-center gap-1.5", className)}>
      <LogOut className="size-5" />
      {conTexto && <span>Salir</span>}
    </button>
  );
}
