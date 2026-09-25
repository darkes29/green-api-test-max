import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { sendMessage, sendMessageError } from "@/lib/green-api";
import { verifySession } from "@/lib/session";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  const credentials = token ? verifySession(token) : null;

  if (!credentials) {
    return NextResponse.json({ error: "Нет сессии" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    chatId?: unknown;
    message?: unknown;
  } | null;
  const chatId = String(body?.chatId ?? "").trim();
  const message = String(body?.message ?? "");

  if (!chatId) {
    return NextResponse.json({ error: "Не указан chatId" }, { status: 400 });
  }
  if (!message.trim()) {
    return NextResponse.json({ error: "Введите текст сообщения" }, { status: 400 });
  }
  if (message.length > 4000) {
    return NextResponse.json(
      { error: "Текст сообщения должен быть не длиннее 4000 символов" },
      { status: 400 },
    );
  }

  try {
    const result = await sendMessage(
      credentials.idInstance,
      credentials.apiTokenInstance,
      chatId,
      message,
    );
    const limitError = sendMessageError(result.httpStatus, result.data);
    if (limitError) {
      return NextResponse.json(limitError, { status: 429 });
    }
    return NextResponse.json(result.data ?? { error: "Пустой ответ" }, {
      status: result.httpStatus,
    });
  } catch {
    return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
  }
}
