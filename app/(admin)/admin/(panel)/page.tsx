import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { tecnicosActivos } from "@/lib/admin";
import { addDays, dateToKey, hoyKey, keyToDate, lunesDe } from "@/lib/fechas";
import { addMeses } from "@/lib/plan-visitas";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarioMes, type ParteCalendario } from "@/components/admin/calendario-mes";
import { cn } from "@/lib/utils";

export const metadata = { title: "Panel" };

const fmtMes = new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric", timeZone: "UTC" });

export default async function AdminHome({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const k = hoyKey();
  const hoy = keyToDate(k);
  const { mes: mesParam } = await searchParams;
  const mes = mesParam && /^\d{4}-(0[1-9]|1[0-2])$/.test(mesParam) ? mesParam : k.slice(0, 7);

  // Semanas completas (lunes–domingo) que cubren el mes
  const primero = `${mes}-01`;
  const ultimo = addDays(addMeses(primero, 1), -1);
  const desde = lunesDe(primero);
  const hasta = addDays(lunesDe(ultimo), 6);
  const dias: string[] = [];
  for (let d = desde; d <= hasta; d = addDays(d, 1)) dias.push(d);

  const [hoyCount, sinAsignar, atencion, completados, partesMes, tecnicos] = await Promise.all([
    prisma.parte.count({ where: { fechaPrevista: hoy, estado: { not: "CANCELADO" } } }),
    prisma.parte.count({ where: { tecnicoId: null, estado: { not: "CANCELADO" } } }),
    prisma.parte.count({ where: { atencion: true } }),
    prisma.parte.count({ where: { estado: "COMPLETADO" } }),
    prisma.parte.findMany({
      where: { fechaPrevista: { gte: keyToDate(desde), lte: keyToDate(hasta) }, estado: { not: "CANCELADO" } },
      orderBy: [{ fechaPrevista: "asc" }, { numero: "asc" }],
      select: {
        id: true,
        numero: true,
        fechaPrevista: true,
        estado: true,
        atencion: true,
        tipoVisita: true,
        cliente: { select: { nombre: true, poblacion: true } },
        tecnico: { select: { id: true, nombre: true, color: true } },
        _count: { select: { muestras: true } },
      },
    }),
    tecnicosActivos(),
  ]);

  const partes: ParteCalendario[] = partesMes.map((p) => ({
    id: p.id,
    numero: p.numero,
    fecha: dateToKey(p.fechaPrevista),
    estado: p.estado,
    atencion: p.atencion,
    tipoVisita: p.tipoVisita,
    cliente: p.cliente.nombre,
    poblacion: p.cliente.poblacion,
    tecnico: p.tecnico,
    muestras: p._count.muestras,
  }));

  const tarjetas = [
    { titulo: "Partes hoy", valor: hoyCount, href: `/admin/partes?desde=${k}&hasta=${k}` },
    { titulo: "Sin asignar", valor: sinAsignar, href: "/admin/partes?tecnicoId=sin" },
    { titulo: "Pendientes de validar", valor: completados, href: "/admin/partes?estado=COMPLETADO" },
    { titulo: "ATENCIÓN (resultados en rojo)", valor: atencion, href: "/admin/partes?atencion=1", rojo: atencion > 0 },
  ];
  const mesAnterior = addMeses(primero, -1).slice(0, 7);
  const mesSiguiente = addMeses(primero, 1).slice(0, 7);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Panel</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tarjetas.map((t) => (
          <Link key={t.titulo} href={t.href}>
            <Card className={cn("transition hover:border-cyan-600", t.rojo && "border-red-500 bg-red-50 hover:border-red-700")}>
              <CardHeader>
                <CardDescription className={cn(t.rojo && "font-semibold text-red-700")}>{t.titulo}</CardDescription>
                <CardTitle className={cn("text-3xl tabular-nums", t.rojo && "text-red-700")}>{t.valor}</CardTitle>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="mr-2 text-lg font-semibold capitalize">{fmtMes.format(keyToDate(primero))}</h2>
          <Button asChild variant="outline" size="icon" className="size-8">
            <Link href={`/admin?mes=${mesAnterior}`} aria-label="Mes anterior">
              <ChevronLeft className="size-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="icon" className="size-8">
            <Link href={`/admin?mes=${mesSiguiente}`} aria-label="Mes siguiente">
              <ChevronRight className="size-4" />
            </Link>
          </Button>
          {mes !== k.slice(0, 7) && (
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin">Hoy</Link>
            </Button>
          )}
        </div>
        <CalendarioMes key={mes} mes={mes} dias={dias} hoy={k} partes={partes} tecnicos={tecnicos} />
      </section>
    </div>
  );
}
