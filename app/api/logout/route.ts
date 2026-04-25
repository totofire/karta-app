import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const response = NextResponse.redirect(new URL("/login", request.url));
  response.cookies.set("token", "", {
    path:    "/",
    maxAge:  0,
    httpOnly: true,
  });
  return response;
}
