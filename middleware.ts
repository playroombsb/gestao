import { NextResponse, type NextRequest } from "next/server";

/*
  baile.playroombsb.com.br é o site público da festa, servido por este mesmo app:
  tudo o que chega por esse domínio vai para /baile. Assim a aplicação enviada lá
  cai direto no CRM (pipeline do evento, fila Aplicação) sem passar por outro servidor.
*/
const SITE_BAILE = /^baile\./i;

export function middleware(req: NextRequest) {
  const host = req.headers.get("host") ?? "";
  if (!SITE_BAILE.test(host)) return NextResponse.next();
  const { pathname } = req.nextUrl;
  if (pathname === "/baile" || pathname.startsWith("/baile/")) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = pathname === "/" ? "/baile" : `/baile${pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  // Arquivos do Next e estáticos passam direto
  matcher: ["/((?!_next/|icon.svg|favicon.ico|robots.txt).*)"],
};
