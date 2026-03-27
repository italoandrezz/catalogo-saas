import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_COOKIE = "catalog_auth_token";
const PROTECTED_ROUTES = ["/dashboard", "/products", "/categories", "/customers", "/inventory", "/profile", "/onboarding"];
const AUTH_ROUTES = ["/login", "/register", "/forgot-password"];

function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some((route) => pathname.startsWith(route));
}

function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some((route) => pathname.startsWith(route));
}

export function proxy(request: NextRequest) {
  const { pathname, protocol } = request.nextUrl;
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  const isLoggedOutRedirect = request.nextUrl.searchParams.get("logged_out") === "1";

  if (isLoggedOutRedirect) {
    const response = NextResponse.next();
    response.cookies.set(AUTH_COOKIE, "", {
      httpOnly: true,
      secure: protocol === "https:" || process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    return response;
  }

  if (!token && isProtectedRoute(pathname)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (token && isAuthRoute(pathname) && !isLoggedOutRedirect) {
    return NextResponse.redirect(new URL("/products", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/products/:path*",
    "/categories/:path*",
    "/customers/:path*",
    "/inventory/:path*",
    "/profile/:path*",
    "/onboarding/:path*",
    "/login",
    "/register",
    "/forgot-password",
  ],
};
