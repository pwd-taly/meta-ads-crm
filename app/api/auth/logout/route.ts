import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const forwardedHost = req.headers.get("x-forwarded-host");
  const host = forwardedHost ?? req.headers.get("host");
  const protocol = req.headers.get("x-forwarded-proto") ?? "https";
  const baseUrl = host ? `${protocol}://${host}` : req.nextUrl.origin;

  const res = NextResponse.redirect(new URL("/login", baseUrl));
  res.cookies.delete("auth_token");
  return res;
}
