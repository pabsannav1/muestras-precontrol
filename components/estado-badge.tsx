import type { EstadoParte } from "@prisma/client";
import { ESTADO_PARTE } from "@/lib/ui-estado";
import { cn } from "@/lib/utils";

export function EstadoBadge({ estado, className }: { estado: EstadoParte; className?: string }) {
  const e = ESTADO_PARTE[estado];
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium", e.clase, className)}>
      {e.label}
    </span>
  );
}
