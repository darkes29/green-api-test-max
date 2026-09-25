import { NextResponse } from "next/server";
import { getStateInstance } from "@/lib/green-api";
import { signSession } from "@/lib/session";

function publicOrigin(request: Request) {
  const host = (
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    ""
  )
    .split(",")[0]
    .trim();
  const proto = (request.headers.get("x-forwarded-proto") ?? "http").split(",")[0].trim();
  if (!host) {
    return new URL(request.url).origin;
  }
  return `${proto}://${host}`;
}

export async function POST(request: Request) {
  const form = await request.formData();
  const idInstance = String(form.get("idInstance") ?? "").trim();
  const apiTokenInstance = String(form.get("apiTokenInstance") ?? "").trim();
  const url = new URL("/", publicOrigin(request));
  const cookieOptions = {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: url.protocol === "https:",
  };

  if (!idInstance || !apiTokenInstance) {
    url.searchParams.set("error", "missing");
    return NextResponse.redirect(url, 303);
  }

  try {
    const data = await getStateInstance(idInstance, apiTokenInstance);
    if (data.stateInstance !== "authorized") {
      url.searchParams.set("error", "unauthorized");
      return NextResponse.redirect(url, 303);
    }
  } catch {
    url.searchParams.set("error", "failed");
    return NextResponse.redirect(url, 303);
  }

  const response = NextResponse.redirect(url, 303);
  response.cookies.set(
    "session",
    signSession({ idInstance, apiTokenInstance }),
    cookieOptions,
  );
  return response;
}

export async function GET(request: Request) {
  const incoming = new URL(request.url);
  const url = new URL("/", publicOrigin(request));
  const error = incoming.searchParams.get("error");
  if (error) {
    url.searchParams.set("error", error);
  }
  const response = NextResponse.redirect(url, 303);
  response.cookies.delete("session");
  return response;
}
