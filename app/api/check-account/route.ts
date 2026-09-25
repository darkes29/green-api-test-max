import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { checkAccount, normalizePhoneNumber } from "@/lib/green-api";
import { verifySession } from "@/lib/session";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  const credentials = token ? verifySession(token) : null;

  if (!credentials) {
    return NextResponse.json({ error: "Нет сессии" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { phoneNumber?: unknown } | null;
  const phoneNumber = normalizePhoneNumber(String(body?.phoneNumber ?? ""));

  if (phoneNumber === null) {
    return NextResponse.json(
      { error: "Номер должен содержать 11 цифр с кодом 7 или 12 цифр с кодом 375" },
      { status: 400 },
    );
  }

  try {
    const result = await checkAccount(
      credentials.idInstance,
      credentials.apiTokenInstance,
      phoneNumber,
    );
    return NextResponse.json(result.data ?? { error: "Пустой ответ" }, { status: result.httpStatus });
  } catch {
    return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
  }
}
