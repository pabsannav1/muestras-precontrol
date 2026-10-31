import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { usuarioActual } from "@/lib/auth";
import { PinLogin } from "@/components/tecnico/pin-login";

export const metadata = { title: "Entrar" };
export const dynamic = "force-dynamic";

export default async function LoginTecnicoPage() {
  const u = await usuarioActual();
  if (u) redirect(u.rol === "ADMIN" ? "/admin" : "/");

  const tecnicos = await prisma.usuario.findMany({
    where: { rol: "TECNICO", activo: true },
    select: { id: true, nombre: true, color: true },
    orderBy: { nombre: "asc" },
  });
  return <PinLogin tecnicos={tecnicos} />;
}
