"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BadgeCheck, Trash2 } from "lucide-react";
import type { EstadoParte } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/cliente-http";

export function AccionesParteAdmin({ parteId, numero, estado }: { parteId: string; numero: string; estado: EstadoParte }) {
  const router = useRouter();

  async function validar() {
    try {
      await api(`/api/admin/partes/${parteId}/validar`, "POST");
      toast.success(`Parte ${numero} validado`);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    }
  }

  async function borrar() {
    if (!confirm(`¿Eliminar el parte ${numero} y todas sus muestras? No se puede deshacer.\n\nSi solo no se va a hacer, cámbialo a Cancelado.`)) return;
    try {
      await api(`/api/admin/partes/${parteId}`, "DELETE");
      toast.success(`Parte ${numero} eliminado`);
      router.push("/admin/partes");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    }
  }

  return (
    <div className="flex gap-2">
      {estado === "COMPLETADO" && (
        <Button onClick={validar} className="bg-sky-700 hover:bg-sky-800">
          <BadgeCheck className="size-4" /> Validar
        </Button>
      )}
      <Button variant="ghost" className="text-destructive" onClick={borrar}>
        <Trash2 className="size-4" /> Eliminar
      </Button>
    </div>
  );
}
