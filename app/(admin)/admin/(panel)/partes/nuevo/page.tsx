import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { tecnicosActivos } from "@/lib/admin";
import { catalogosActivos } from "@/lib/partes";
import { esKeyValida, hoyKey } from "@/lib/fechas";
import { ParteForm } from "@/components/admin/parte-form";
import { TIPOS_VISITA } from "@/lib/validations";

export const metadata = { title: "Nuevo parte" };

export default async function NuevoPartePage({ searchParams }: { searchParams: Promise<{ fecha?: string; clienteId?: string; tipo?: string }> }) {
  const { fecha, clienteId, tipo } = await searchParams;
  const tipoVisita = TIPOS_VISITA.find((t) => t === tipo) ?? null;
  const [tecnicos, catalogos, cliente] = await Promise.all([
    tecnicosActivos(),
    catalogosActivos(),
    clienteId
      ? prisma.cliente.findUnique({ where: { id: clienteId }, select: { id: true, codigo: true, nombre: true, poblacion: true } })
      : null,
  ]);
  return (
    <div className="max-w-5xl space-y-4">
      <Link href="/admin/partes" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> Partes
      </Link>
      <h1 className="text-2xl font-semibold">Nuevo parte</h1>
      <ParteForm inicial={{ fecha: esKeyValida(fecha) ? fecha : hoyKey(), cliente, tipoVisita }} tecnicos={tecnicos} {...catalogos} />
    </div>
  );
}
