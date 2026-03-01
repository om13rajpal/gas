export { auth as middleware } from "@/lib/auth";

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/inventory/:path*",
    "/staff/:path*",
    "/settlements/:path*",
    "/settings/:path*",
    "/api/dashboard/:path*",
    "/api/inventory/:path*",
    "/api/staff/:path*",
    "/api/settlements/:path*",
    "/api/users/:path*",
    "/api/seed/:path*",
  ],
};
