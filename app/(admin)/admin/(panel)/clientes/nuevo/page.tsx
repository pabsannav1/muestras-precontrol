import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { ClienteForm } from "@/components/admin/cliente-form";

export const metadata = { title: "Nuevo cliente" };

export default function NuevoClientePage() {
  return (
    <div className="max-w-4xl space-y-4">
      <Link href="/admin/clientes" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> Clientes
      </Link>
      <h1 className="text-2xl font-semibold">Nuevo cliente</h1>
      <ClienteForm />
    </div>
  );
}
