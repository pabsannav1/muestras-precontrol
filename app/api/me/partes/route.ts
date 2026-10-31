import { requerirApi, HttpError } from "@/lib/auth";
import { manejar } from "@/lib/api";
import { addDays, esKeyValida, hoyKey } from "@/lib/fechas";
import { partesTecnico } from "@/lib/partes";

const MAX_DIAS = 62;

export async function GET(req: Request) {
  return manejar(async () => {
    const u = await requerirApi("TECNICO");
    const url = new URL(req.url);
    const hoy = hoyKey();
    const desde = url.searchParams.get("desde") ?? addDays(hoy, -3);
    const hasta = url.searchParams.get("hasta") ?? addDays(hoy, 10);
    if (!esKeyValida(desde) || !esKeyValida(hasta) || desde > hasta) throw new HttpError(400, "Rango de fechas no válido");
    if (addDays(desde, MAX_DIAS) < hasta) throw new HttpError(400, `Rango máximo de ${MAX_DIAS} días`);

    const { partes, atrasados } = await partesTecnico(u.id, desde, hasta, hoy);
    return { hoy, desde, hasta, partes, atrasados };
  });
}
