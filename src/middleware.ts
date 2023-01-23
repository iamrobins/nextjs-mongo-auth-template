import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const protectedRoutes = ["/profile"];
const authRoutes = ["/signin", "/signup"];

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("token")?.value;

  if (protectedRoutes.includes(request.nextUrl.pathname) && !token) {
    request.cookies.delete("token");
    const response = NextResponse.redirect(new URL("/signin", request.url));
    response.cookies.delete("token");

    return response;
  }

  if (token === undefined) return;

  try {
    await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET));
  } catch {
    return new NextResponse(
      JSON.stringify({ error: { message: "authentication required" } }),
      { status: 401 }
    );
  }

  if (authRoutes.includes(request.nextUrl.pathname) && token) {
    return NextResponse.redirect(new URL("/profile", request.url));
  }
}
