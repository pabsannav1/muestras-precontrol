"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Copy, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const CORREO_ADMINISTRACION = "administracion@lanutec.com";

/** Abre el cliente de correo con los datos de las muestras (una línea por muestra). */
export function CorreoAdministracion({ asunto, cuerpo }: { asunto: string; cuerpo: string }) {
  const [abierto, setAbierto] = useState(false);
  const mailto = `mailto:${CORREO_ADMINISTRACION}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;

  async function copiar() {
    try {
      await navigator.clipboard.writeText(cuerpo);
      toast.success("Texto copiado");
    } catch {
      toast.error("No se pudo copiar");
    }
  }

  return (
    <>
      <Button variant="outline" onClick={() => setAbierto(true)}>
        <Mail className="size-4" /> Enviar a administración
      </Button>
      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Correo a administración</DialogTitle>
            <DialogDescription>
              Para: <span className="font-medium text-foreground">{CORREO_ADMINISTRACION}</span> · Asunto: {asunto}
            </DialogDescription>
          </DialogHeader>
          <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-md border bg-muted/50 p-3 text-xs">{cuerpo}</pre>
          <DialogFooter>
            <Button variant="ghost" onClick={copiar}>
              <Copy className="size-4" /> Copiar texto
            </Button>
            <Button asChild onClick={() => setAbierto(false)}>
              <a href={mailto}>
                <Mail className="size-4" /> Abrir en el correo
              </a>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
