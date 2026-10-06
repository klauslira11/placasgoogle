import { auth } from "@/auth";

export default auth((req) => {
  const path = req.nextUrl.pathname;
  const isLogged = !!req.auth;
  const role = (req.auth?.user as any)?.role;

  const isDashboard = path.startsWith("/dashboard");
  const isAdmin = path.startsWith("/admin");

  if ((isDashboard || isAdmin) && !isLogged) {
    return Response.redirect(new URL("/login", req.nextUrl));
  }
  if (isAdmin && role !== "ADMIN") {
    return Response.redirect(new URL("/dashboard", req.nextUrl));
  }
  if ((path === "/login" || path === "/register") && isLogged) {
    return Response.redirect(new URL("/dashboard", req.nextUrl));
  }
});

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/login", "/register"],
};
