// middleware.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// Define public routes that don't require authentication
const publicRoutes = ["/", "/login", "/signup", "/api/auth/register", "/api/auth/error", "/api/auth/callback/credentials"];

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;

  // Allow static files and API routes (some APIs handle their own auth, some are public)
  if (nextUrl.pathname.startsWith("/_next") || nextUrl.pathname.includes(".")) {
    return NextResponse.next();
  }

  const isPublicRoute = publicRoutes.includes(nextUrl.pathname) || nextUrl.pathname.startsWith("/events");

  // If user is trying to access a protected route while not logged in, redirect to login
  if (!isLoggedIn && !isPublicRoute && !nextUrl.pathname.startsWith("/api/")) {
    let callbackUrl = nextUrl.pathname;
    if (nextUrl.search) {
      callbackUrl += nextUrl.search;
    }
    const encodedCallbackUrl = encodeURIComponent(callbackUrl);
    return Response.redirect(new URL(`/login?from=${encodedCallbackUrl}`, nextUrl));
  }

  // If user is logged in and trying to access auth pages, redirect to their dashboard
  if (isLoggedIn && (nextUrl.pathname === "/login" || nextUrl.pathname === "/signup")) {
    const role = req.auth?.user?.role;
    if (role === "STUDENT") {
      return Response.redirect(new URL("/app", nextUrl));
    } else if (role === "ORGANIZER") {
      return Response.redirect(new URL("/organizer", nextUrl));
    } else if (role === "ADMIN") {
      return Response.redirect(new URL("/admin", nextUrl));
    }
    return Response.redirect(new URL("/", nextUrl));
  }

  // Enforce role-based access
  if (isLoggedIn) {
    const role = req.auth?.user?.role;
    
    // Students can't access organizer/admin routes
    if (role === "STUDENT" && (nextUrl.pathname.startsWith("/organizer") || nextUrl.pathname.startsWith("/admin"))) {
      return Response.redirect(new URL("/app", nextUrl));
    }
    
    // Organizers can't access student app or admin routes
    if (role === "ORGANIZER" && (nextUrl.pathname.startsWith("/app") || nextUrl.pathname.startsWith("/admin"))) {
      return Response.redirect(new URL("/organizer", nextUrl));
    }

    // Admins can't access student/organizer specific routes (or maybe they can? let's redirect them to admin for now)
    if (role === "ADMIN" && (nextUrl.pathname.startsWith("/app") || nextUrl.pathname.startsWith("/organizer"))) {
      return Response.redirect(new URL("/admin", nextUrl));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
