import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verificarSesion } from "@/lib/session";

// Primera barrera por rol. Cada página/handler vuelve a comprobar la sesión contra la BD.
const PUBLICAS = ["/login", "/admin/login", "/api/auth/"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLICAS.some((p) => pathname === p || pathname.startsWith(p))) return NextResponse.next();

  const sesion = await verificarSesion(req.cookies.get(SESSION_COOKIE)?.value);
  const esApi = pathname.startsWith("/api/");
  const zonaAdmin = pathname === "/admin" || pathname.startsWith("/admin/") || pathname.startsWith("/api/admin/");
  const rolNecesario = zonaAdmin ? "ADMIN" : "TECNICO";

  if (sesion?.rol === rolNecesario) return NextResponse.next();

  if (esApi) {
    return NextResponse.json(
      { error: sesion ? "Sin permiso" : "No autenticado" },
      { status: sesion ? 403 : 401 },
    );
  }

  // Con sesión del otro rol, llevar a su zona; sin sesión, a su login.
  const destino = sesion ? (sesion.rol === "ADMIN" ? "/admin" : "/") : zonaAdmin ? "/admin/login" : "/login";
  return NextResponse.redirect(new URL(destino, req.url));
}

export const config = {
  matcher: ["/((?!_next/|favicon.ico|icons/|manifest.webmanifest|sw.js|robots.txt).*)"],
};
