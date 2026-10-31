import { redirect } from "next/navigation";
import { usuarioActual } from "@/lib/auth";
import { AdminLoginForm } from "@/components/admin/login-form";

export const metadata = { title: "Administración" };
export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const u = await usuarioActual();
  if (u?.rol === "ADMIN") redirect("/admin");
  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted/40 p-4">
      <AdminLoginForm />
    </main>
  );
}
