import { NextRequest, NextResponse } from "next/server";

const defaultLocale = "pt-BR";

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith(`/${defaultLocale}/`) ||
    pathname === `/${defaultLocale}`
  ) {
    request.nextUrl.pathname = pathname.replace(`/${defaultLocale}`, "") || "/";
    return NextResponse.redirect(request.nextUrl);
  }

  request.nextUrl.pathname = `/${defaultLocale}${pathname}`;
  return NextResponse.rewrite(request.nextUrl);
}

export const config = {
  matcher: [
    // Skip all internal paths (_next)
    "/((?!_next|api).*)",
    // Optional: only run on root (/) URL
    // '/'
  ],
};
