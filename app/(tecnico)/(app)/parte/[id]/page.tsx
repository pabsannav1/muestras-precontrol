import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, ChevronLeft, ChevronRight, Circle, MapPin, Phone, User } from "lucide-react";
import { requerirPagina } from "@/lib/auth";
import { catalogosActivos, parteDetalle, type ParteDetalle } from "@/lib/partes";
import { ESTADOS_EDITABLES_TECNICO } from "@/lib/estado";
import { dateToKey, formatoLargo } from "@/lib/fechas";
import { EstadoBadge } from "@/components/estado-badge";
import { AccionesParte } from "@/components/tecnico/acciones-parte";

export const metadata = { title: "Parte" };

export default async function PartePage({ params }: { params: Promise<{ id: string }> }) {
  const u = await requerirPagina("TECNICO");
  const { id } = await params;
  const parte = await parteDetalle(id);
  if (!parte || parte.tecnicoId !== u.id) notFound();

  const editable = ESTADOS_EDITABLES_TECNICO.includes(parte.estado);
  const pendientes = parte.muestras.filter((m) => m.estado === "PENDIENTE").length;
  const grupos = agruparPorAgua(parte.muestras);
  const c = parte.cliente;
  const direccion = [c.direccion, c.poblacion].filter(Boolean).join(", ");

  return (
    <div className="mx-auto max-w-md">
      <header className="sticky top-0 z-10 flex items-center gap-2 border-b bg-background px-2 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <Link href="/" className="flex size-11 items-center justify-center rounded-full active:bg-muted" aria-label="Volver">
          <ChevronLeft className="size-6" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold leading-tight">{c.nombre}</p>
          <p className="text-xs text-muted-foreground">
            {parte.numero} · <span className="capitalize">{formatoLargo(dateToKey(parte.fechaPrevista))}</span>
          </p>
        </div>
        <EstadoBadge estado={parte.estado} className="mr-2" />
      </header>

      <div className="space-y-4 p-4">
        <section className="rounded-2xl border bg-card p-4 shadow-xs">
          <div className="text-xs text-muted-foreground">
            Cód. {c.codigo}
            {parte.numPedido && <> · Pedido {parte.numPedido}</>}
          </div>
          <div className="mt-3 grid gap-2">
            {direccion && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-11 items-center gap-3 rounded-xl bg-muted/60 px-3 py-2 active:bg-muted"
              >
                <MapPin className="size-5 shrink-0 text-cyan-700" />
                <span className="text-sm">{direccion}</span>
              </a>
            )}
            {c.telefono && (
              <a href={`tel:${c.telefono.replace(/\s/g, "")}`} className="flex min-h-11 items-center gap-3 rounded-xl bg-muted/60 px-3 py-2 active:bg-muted">
                <Phone className="size-5 shrink-0 text-cyan-700" />
                <span className="text-sm">{c.telefono}</span>
              </a>
            )}
            {c.contacto && (
              <div className="flex min-h-11 items-center gap-3 px-3 text-sm">
                <User className="size-5 shrink-0 text-muted-foreground" />
                {c.contacto}
              </div>
            )}
          </div>
          {(parte.observaciones || c.notas) && (
            <div className="mt-3 space-y-1 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
              {parte.observaciones && <p>{parte.observaciones}</p>}
              {c.notas && <p className="text-amber-800/80">{c.notas}</p>}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-2 flex items-baseline justify-between px-1 font-semibold">
            Muestras
            <span className="text-sm font-normal text-muted-foreground tabular-nums">
              {parte.muestras.length - pendientes}/{parte.muestras.length} tomadas
            </span>
          </h2>
          <div className="space-y-3">
            {grupos.map((g) => (
              <div key={g.tipoAgua} className="overflow-hidden rounded-2xl border bg-card shadow-xs">
                <div className="flex items-center justify-between border-b bg-muted/50 px-4 py-2 text-sm font-semibold">
                  {g.tipoAgua}
                  <span className="font-normal tabular-nums text-muted-foreground">
                    {g.muestras.filter((m) => m.estado === "TOMADA").length}/{g.muestras.length}
                  </span>
                </div>
                <ul className="divide-y">
                  {g.muestras.map((m) => (
                    <li key={m.id}>
                      <Link
                        href={`/parte/${parte.id}/muestra/${m.id}`}
                        className="flex min-h-14 items-center gap-3 px-4 py-2 active:bg-muted"
                      >
                        {m.estado === "TOMADA" ? (
                          <CheckCircle2 className="size-6 shrink-0 text-emerald-600" />
                        ) : (
                          <Circle className="size-6 shrink-0 text-muted-foreground/50" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">
                            {m.referencia}
                            {m.puntoRecogida && <span className="font-normal text-muted-foreground"> · {m.puntoRecogida}</span>}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">{m.tipoAnalisis.nombre}</p>
                        </div>
                        <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {grupos.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Este parte no tiene muestras.</p>}
          </div>
        </section>

        {editable ? (
          <AccionesParte
            parteId={parte.id}
            estado={parte.estado}
            pendientes={pendientes}
            {...(await catalogosActivos())}
          />
        ) : (
          <p className="rounded-xl bg-muted p-3 text-center text-sm text-muted-foreground">
            Parte {parte.estado === "VALIDADO" ? "validado" : "cancelado"}: solo consulta.
          </p>
        )}
      </div>
    </div>
  );
}

function agruparPorAgua(muestras: ParteDetalle["muestras"]) {
  const map = new Map<string, { tipoAgua: string; orden: number; muestras: ParteDetalle["muestras"] }>();
  for (const m of muestras) {
    const g = map.get(m.tipoAgua.nombre) ?? { tipoAgua: m.tipoAgua.nombre, orden: m.tipoAgua.orden, muestras: [] };
    g.muestras.push(m);
    map.set(m.tipoAgua.nombre, g);
  }
  return [...map.values()].sort((a, b) => a.orden - b.orden);
}
