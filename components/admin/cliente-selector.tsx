"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/cliente-http";
import { cn } from "@/lib/utils";

export type ClienteOpcion = { id: string; codigo: string; nombre: string; poblacion: string | null };

/** Buscador de clientes activos por nombre, código o población. */
export function ClienteSelector({
  valor,
  onChange,
  invalido,
}: {
  valor: ClienteOpcion | null;
  onChange: (c: ClienteOpcion | null) => void;
  invalido?: boolean;
}) {
  const [q, setQ] = useState("");
  const [opciones, setOpciones] = useState<ClienteOpcion[]>([]);
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const t = setTimeout(async () => {
      try {
        const r = await api<{ clientes: ClienteOpcion[] }>(`/api/admin/clientes?activo=1&limite=12&q=${encodeURIComponent(q)}`);
        setOpciones(r.clientes);
        setActivo(0);
      } catch {
        setOpciones([]);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [q, abierto]);

  function elegir(c: ClienteOpcion) {
    onChange(c);
    setAbierto(false);
    setQ("");
  }

  if (valor) {
    return (
      <div className="flex h-9 items-center gap-2 rounded-md border bg-muted/40 px-3 text-sm">
        <span className="font-mono text-xs text-muted-foreground">{valor.codigo}</span>
        <span className="truncate font-medium">{valor.nombre}</span>
        {valor.poblacion && <span className="truncate text-muted-foreground">· {valor.poblacion}</span>}
        <button
          type="button"
          className="ml-auto text-muted-foreground hover:text-foreground"
          onClick={() => {
            onChange(null);
            setTimeout(() => input.current?.focus());
          }}
          aria-label="Cambiar cliente"
        >
          <X className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
      <Input
        ref={input}
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setAbierto(true);
        }}
        onFocus={() => setAbierto(true)}
        onBlur={() => setTimeout(() => setAbierto(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") setActivo((a) => Math.min(a + 1, opciones.length - 1));
          else if (e.key === "ArrowUp") setActivo((a) => Math.max(a - 1, 0));
          else if (e.key === "Enter" && opciones[activo]) {
            e.preventDefault();
            elegir(opciones[activo]);
          } else return;
          e.preventDefault();
        }}
        placeholder="Buscar cliente por nombre, código o población…"
        className="pl-8"
        aria-invalid={invalido}
        role="combobox"
        aria-expanded={abierto}
      />
      {abierto && (
        <ul className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-md border bg-popover p-1 shadow-md" role="listbox">
          {opciones.map((c, i) => (
            <li key={c.id} role="option" aria-selected={i === activo}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => elegir(c)}
                onMouseEnter={() => setActivo(i)}
                className={cn("flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm", i === activo && "bg-muted")}
              >
                <span className="w-16 shrink-0 font-mono text-xs text-muted-foreground">{c.codigo}</span>
                <span className="truncate font-medium">{c.nombre}</span>
                {c.poblacion && <span className="ml-auto shrink-0 text-xs text-muted-foreground">{c.poblacion}</span>}
              </button>
            </li>
          ))}
          {opciones.length === 0 && <li className="px-2 py-3 text-center text-sm text-muted-foreground">Sin resultados</li>}
        </ul>
      )}
    </div>
  );
}
