"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { api, erroresCampos } from "@/lib/cliente-http";
import { clienteSchema } from "@/lib/validations";

type Valores = {
  codigo: string;
  nombre: string;
  direccion: string;
  poblacion: string;
  contacto: string;
  telefono: string;
  email: string;
  notas: string;
  numeroContrato: string;
  fechaContrato: string;
  fechaRenovacion: string;
  activo: boolean;
};

const VACIO: Valores = {
  codigo: "",
  nombre: "",
  direccion: "",
  poblacion: "",
  contacto: "",
  telefono: "",
  email: "",
  notas: "",
  numeroContrato: "",
  fechaContrato: "",
  fechaRenovacion: "",
  activo: true,
};

const CAMPOS: { campo: Exclude<keyof Valores, "activo" | "notas">; label: string; ancho?: string; tipo?: string }[] = [
  { campo: "codigo", label: "Código cliente", ancho: "sm:col-span-1" },
  { campo: "nombre", label: "Nombre", ancho: "sm:col-span-3" },
  { campo: "direccion", label: "Dirección", ancho: "sm:col-span-3" },
  { campo: "poblacion", label: "Población", ancho: "sm:col-span-1" },
  { campo: "contacto", label: "Contacto", ancho: "sm:col-span-2" },
  { campo: "telefono", label: "Teléfono", ancho: "sm:col-span-1", tipo: "tel" },
  { campo: "email", label: "Email", ancho: "sm:col-span-1", tipo: "email" },
  { campo: "numeroContrato", label: "Nº de contrato", ancho: "sm:col-span-2" },
  { campo: "fechaContrato", label: "Firma del contrato", ancho: "sm:col-span-1", tipo: "date" },
  { campo: "fechaRenovacion", label: "Renovación del contrato", ancho: "sm:col-span-1", tipo: "date" },
];

export function ClienteForm({ cliente }: { cliente?: { id: string } & { [K in keyof Valores]: Valores[K] | null } }) {
  const router = useRouter();
  const [v, setV] = useState<Valores>(
    cliente ? (Object.fromEntries(Object.keys(VACIO).map((k) => [k, cliente[k as keyof Valores] ?? VACIO[k as keyof Valores]])) as Valores) : VACIO,
  );
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    const r = clienteSchema.safeParse(v);
    if (!r.success) {
      setErrores(Object.fromEntries(r.error.issues.map((i) => [String(i.path[0]), i.message])));
      return;
    }
    setGuardando(true);
    try {
      if (cliente) {
        await api(`/api/admin/clientes/${cliente.id}`, "PUT", v);
        toast.success("Cliente guardado");
        router.refresh();
      } else {
        const { cliente: c } = await api<{ cliente: { id: string } }>("/api/admin/clientes", "POST", v);
        toast.success("Cliente creado");
        router.push(`/admin/clientes/${c.id}`);
      }
    } catch (err) {
      setErrores(erroresCampos(err));
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setGuardando(false);
    }
  }

  async function borrar() {
    if (!cliente || !confirm("¿Borrar este cliente? No se puede deshacer.")) return;
    try {
      await api(`/api/admin/clientes/${cliente.id}`, "DELETE");
      toast.success("Cliente borrado");
      router.push("/admin/clientes");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
  }

  const set = (campo: keyof Valores) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setV((x) => ({ ...x, [campo]: e.target.value }));
    setErrores((x) => ({ ...x, [campo]: "" }));
  };

  return (
    <form onSubmit={guardar} className="grid gap-4 rounded-xl border bg-card p-5">
      <div className="grid gap-4 sm:grid-cols-4">
        {CAMPOS.map((c) => (
          <div key={c.campo} className={`grid gap-1.5 ${c.ancho ?? ""}`}>
            <Label htmlFor={c.campo}>{c.label}</Label>
            <Input id={c.campo} type={c.tipo ?? "text"} value={v[c.campo]} onChange={set(c.campo)} aria-invalid={!!errores[c.campo]} />
            {errores[c.campo] && <p className="text-xs text-destructive">{errores[c.campo]}</p>}
          </div>
        ))}
        <div className="grid gap-1.5 sm:col-span-4">
          <Label htmlFor="notas">Notas (las ve el técnico)</Label>
          <Textarea id="notas" rows={2} value={v.notas} onChange={set("notas")} />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={v.activo} onCheckedChange={(c) => setV((x) => ({ ...x, activo: c === true }))} />
          Activo
        </label>
        <div className="ml-auto flex gap-2">
          {cliente && (
            <Button type="button" variant="ghost" className="text-destructive" onClick={borrar}>
              <Trash2 className="size-4" /> Borrar
            </Button>
          )}
          <Button type="submit" disabled={guardando}>
            {guardando && <Loader2 className="size-4 animate-spin" />}
            {cliente ? "Guardar cambios" : "Crear cliente"}
          </Button>
        </div>
      </div>
    </form>
  );
}
