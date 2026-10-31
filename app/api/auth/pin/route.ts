import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { crearSesion, HttpError } from "@/lib/auth";
import { leerJson, manejar } from "@/lib/api";
import { pinLoginSchema } from "@/lib/validations";
import { bloqueadoHasta, limpiarFallos, registrarFallo } from "@/lib/limitador";

export async function POST(req: Request) {
  return manejar(async () => {
    const { usuarioId, pin } = pinLoginSchema.parse(await leerJson(req));
    const clave = `pin:${usuarioId}`;
    const bloqueo = bloqueadoHasta(clave);
    if (bloqueo) {
      const min = Math.ceil((bloqueo - Date.now()) / 60000);
      throw new HttpError(429, `Demasiados intentos. Prueba en ${min} min.`);
    }

    const u = await prisma.usuario.findUnique({ where: { id: usuarioId } });
    const ok = !!u && u.activo && u.rol === "TECNICO" && !!u.pinHash && (await bcrypt.compare(pin, u.pinHash));
    if (!ok) {
      registrarFallo(clave);
      throw new HttpError(401, "PIN incorrecto");
    }
    limpiarFallos(clave);
    await crearSesion({ uid: u.id, rol: "TECNICO", nombre: u.nombre });
    return { ok: true, nombre: u.nombre };
  });
}
