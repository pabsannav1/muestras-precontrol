import { cerrarSesion } from "@/lib/auth";
import { manejar } from "@/lib/api";

export async function POST() {
  return manejar(async () => {
    await cerrarSesion();
    return { ok: true };
  });
}
