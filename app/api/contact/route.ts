import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { formatPhoneNumber, getContactInfo } from "@/lib/green-api";
import { verifySession } from "@/lib/session";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  const credentials = token ? verifySession(token) : null;

  if (!credentials) {
    return NextResponse.json({ error: "Нет сессии" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { chatId?: unknown } | null;
  const chatId = String(body?.chatId ?? "").trim();

  if (!/^\d{1,20}(@(c\.us|lid))?$/.test(chatId)) {
    return NextResponse.json({ error: "Не указан чат" }, { status: 400 });
  }

  try {
    const result = await getContactInfo(
      credentials.idInstance,
      credentials.apiTokenInstance,
      chatId,
    );
    const data = result.data;
    return NextResponse.json(
      {
        name: data?.contactName || data?.name || "",
        phone: formatPhoneNumber(data?.phoneNumber),
        avatar: data?.avatar || "",
        chatId,
      },
      { status: result.httpStatus },
    );
  } catch {
    return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
  }
}
