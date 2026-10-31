import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { crearSesion, HttpError } from "@/lib/auth";
import { leerJson, manejar } from "@/lib/api";
import { adminLoginSchema } from "@/lib/validations";
import { bloqueadoHasta, limpiarFallos, registrarFallo } from "@/lib/limitador";

export async function POST(req: Request) {
  return manejar(async () => {
    const { email, password } = adminLoginSchema.parse(await leerJson(req));
    const clave = `login:${email}`;
    if (bloqueadoHasta(clave)) throw new HttpError(429, "Demasiados intentos. Prueba en unos minutos.");

    const u = await prisma.usuario.findUnique({ where: { email } });
    const ok = !!u && u.activo && u.rol === "ADMIN" && !!u.passwordHash && (await bcrypt.compare(password, u.passwordHash));
    if (!ok) {
      registrarFallo(clave);
      throw new HttpError(401, "Email o contraseña incorrectos");
    }
    limpiarFallos(clave);
    await crearSesion({ uid: u.id, rol: "ADMIN", nombre: u.nombre });
    return { ok: true };
  });
}
