"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Delete, Droplets } from "lucide-react";
import { cn } from "@/lib/utils";

type Tecnico = { id: string; nombre: string; color: string };

const PIN_MAX = 6;
const PIN_MIN = 4;

export function PinLogin({ tecnicos }: { tecnicos: Tecnico[] }) {
  const router = useRouter();
  const [sel, setSel] = useState<Tecnico | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function entrar(valor: string) {
    if (!sel || valor.length < PIN_MIN) return;
    setEnviando(true);
    setError(null);
    const res = await fetch("/api/auth/pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usuarioId: sel.id, pin: valor }),
    });
    setEnviando(false);
    if (res.ok) {
      router.replace("/");
      router.refresh();
      return;
    }
    const data = await res.json().catch(() => ({}));
    setError(data.error ?? "No se pudo entrar");
    setPin("");
  }

  function pulsar(d: string) {
    if (enviando) return;
    setError(null);
    const nuevo = (pin + d).slice(0, PIN_MAX);
    setPin(nuevo);
    if (nuevo.length === PIN_MAX) entrar(nuevo);
  }

  if (!sel) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col px-4 pb-8 pt-[max(2rem,env(safe-area-inset-top))]">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-cyan-700 text-white">
            <Droplets className="size-7" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Toma de muestras</h1>
            <p className="text-sm text-muted-foreground">¿Quién eres?</p>
          </div>
        </div>
        <ul className="grid gap-3">
          {tecnicos.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => setSel(t)}
                className="flex w-full items-center gap-4 rounded-2xl border bg-card p-4 text-left text-lg font-medium shadow-xs active:scale-[0.99] active:bg-muted"
              >
                <span
                  className="flex size-11 shrink-0 items-center justify-center rounded-full text-base font-semibold text-white"
                  style={{ backgroundColor: t.color }}
                >
                  {t.nombre.slice(0, 1)}
                </span>
                {t.nombre}
              </button>
            </li>
          ))}
          {tecnicos.length === 0 && <p className="text-muted-foreground">No hay técnicos activos.</p>}
        </ul>
        <a href="/admin/login" className="mt-auto pt-10 text-center text-sm text-muted-foreground underline-offset-4 hover:underline">
          Acceso administración
        </a>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
      <button
        type="button"
        onClick={() => {
          setSel(null);
          setPin("");
          setError(null);
        }}
        className="-ml-2 flex h-11 items-center gap-1 self-start rounded-lg px-2 text-muted-foreground active:bg-muted"
      >
        <ChevronLeft className="size-5" /> Cambiar técnico
      </button>

      <div className="mt-6 text-center">
        <span
          className="mx-auto flex size-16 items-center justify-center rounded-full text-2xl font-semibold text-white"
          style={{ backgroundColor: sel.color }}
        >
          {sel.nombre.slice(0, 1)}
        </span>
        <h1 className="mt-3 text-xl font-semibold">{sel.nombre}</h1>
        <p className="text-sm text-muted-foreground">Introduce tu PIN</p>
      </div>

      <div className="mt-6 flex justify-center gap-3" aria-label={`${pin.length} dígitos introducidos`}>
        {Array.from({ length: Math.max(PIN_MIN, pin.length) }, (_, i) => (
          <span key={i} className={cn("size-4 rounded-full border-2 border-foreground/40", i < pin.length && "border-foreground bg-foreground")} />
        ))}
      </div>
      <p className={cn("mt-3 h-5 text-center text-sm text-destructive", !error && "invisible")} role="alert">
        {error}
      </p>

      <div className="mt-auto grid grid-cols-3 gap-3 pt-6">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <Tecla key={d} onClick={() => pulsar(d)}>
            {d}
          </Tecla>
        ))}
        <Tecla onClick={() => setPin((p) => p.slice(0, -1))} aria-label="Borrar" variante="suave">
          <Delete className="size-6" />
        </Tecla>
        <Tecla onClick={() => pulsar("0")}>0</Tecla>
        <Tecla
          onClick={() => entrar(pin)}
          disabled={pin.length < PIN_MIN || enviando}
          variante="primaria"
          aria-label="Entrar"
        >
          {enviando ? "…" : "OK"}
        </Tecla>
      </div>
    </main>
  );
}

function Tecla({
  variante = "normal",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variante?: "normal" | "suave" | "primaria" }) {
  return (
    <button
      type="button"
      className={cn(
        "flex h-16 items-center justify-center rounded-2xl text-2xl font-medium transition active:scale-95 disabled:opacity-40",
        variante === "normal" && "border bg-card shadow-xs active:bg-muted",
        variante === "suave" && "text-muted-foreground active:bg-muted",
        variante === "primaria" && "bg-cyan-700 text-lg font-semibold text-white active:bg-cyan-800",
        className,
      )}
      {...props}
    />
  );
}
