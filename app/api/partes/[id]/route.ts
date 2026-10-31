import { requerirApi, HttpError } from "@/lib/auth";
import { manejar } from "@/lib/api";
import { comprobarAcceso, parteDetalle, sugerenciasPuntos } from "@/lib/partes";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return manejar(async () => {
    const u = await requerirApi();
    const { id } = await params;
    const parte = await parteDetalle(id);
    if (!parte) throw new HttpError(404, "Parte no encontrado");
    comprobarAcceso(u, parte);
    return { parte, sugerenciasPuntos: await sugerenciasPuntos(parte.cliente.id) };
  });
}
