import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  deleteNotification,
  ensureIncomingWebhook,
  incomingFromNotification,
  receiveNotification,
} from "@/lib/green-api";
import { verifySession } from "@/lib/session";

export const maxDuration = 30;

let receiving = false;
const incomingReady = new Set<string>();

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  const credentials = token ? verifySession(token) : null;

  if (!credentials) {
    return NextResponse.json({ error: "Нет сессии" }, { status: 401 });
  }

  if (receiving) {
    return NextResponse.json({ notification: null });
  }
  receiving = true;

  try {
    if (!incomingReady.has(credentials.idInstance)) {
      const settings = await ensureIncomingWebhook(
        credentials.idInstance,
        credentials.apiTokenInstance,
      );
      if (!settings.ok) {
        return NextResponse.json(
          { error: "Не удалось включить входящие уведомления" },
          { status: 502 },
        );
      }
      incomingReady.add(credentials.idInstance);
      if (settings.changed) {
        return NextResponse.json({
          notification: null,
          hint: "Входящие уведомления включены. Напишите в чат новое сообщение: более ранние в очередь не попадают.",
        });
      }
    }

    const result = await receiveNotification(
      credentials.idInstance,
      credentials.apiTokenInstance,
    );
    const receiptId = result.data?.receiptId;

    if (!receiptId) {
      if (result.httpStatus !== 200) {
        const error =
          result.data?.message ||
          result.data?.error ||
          result.data?.reason ||
          "Не удалось получить уведомление";
        return NextResponse.json({ error }, { status: result.httpStatus });
      }
      return NextResponse.json({ notification: null });
    }

    const notification = incomingFromNotification(result.data?.body);
    await deleteNotification(
      credentials.idInstance,
      credentials.apiTokenInstance,
      receiptId,
    );
    return NextResponse.json({ notification });
  } catch {
    return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
  } finally {
    receiving = false;
  }
}
