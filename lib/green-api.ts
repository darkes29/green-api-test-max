const apiURL = (process.env.GREEN_API_URL || "https://3100.api.green-api.com").replace(/\/$/, "");

export async function getStateInstance(idInstance: string, apiTokenInstance: string) {
  const res = await fetch(
    `${apiURL}/waInstance${idInstance}/getStateInstance/${apiTokenInstance}`,
    { cache: "no-store" },
  );

  const data = (await res.json().catch(() => null)) as { stateInstance?: string } | null;
  if (!res.ok || !data) {
    return { stateInstance: undefined };
  }

  return data;
}

export type CheckAccountResult = {
  exist?: boolean;
  chatId?: string;
  fromCache?: boolean;
  status?: boolean;
  reason?: string;
  message?: string;
  error?: string;
};

export function normalizePhoneNumber(value: string) {
  const digits = value.replace(/\D/g, "");
  const valid =
    (digits.length === 11 && digits.startsWith("7")) ||
    (digits.length === 12 && digits.startsWith("375"));
  return valid ? Number(digits) : null;
}

export type ContactInfo = {
  avatar?: string;
  name?: string;
  contactName?: string;
  chatId?: string;
  phoneNumber?: number;
};

export function formatPhoneNumber(value: number | string | undefined) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!digits || digits === "0") {
    return "";
  }
  if (digits.length === 11 && digits.startsWith("7")) {
    const local = digits.slice(1);
    return `+7 ${[local.slice(0, 3), local.slice(3, 6), local.slice(6, 8), local.slice(8, 10)].filter(Boolean).join(" ")}`;
  }
  if (digits.length === 12 && digits.startsWith("375")) {
    const local = digits.slice(3);
    return `+375 ${[local.slice(0, 2), local.slice(2, 5), local.slice(5, 7), local.slice(7, 9)].filter(Boolean).join(" ")}`;
  }
  return "";
}

export async function getContactInfo(
  idInstance: string,
  apiTokenInstance: string,
  chatId: string,
) {
  const res = await fetch(
    `${apiURL}/waInstance${idInstance}/getContactInfo/${apiTokenInstance}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId }),
      cache: "no-store",
    },
  );
  const data = (await res.json().catch(() => null)) as ContactInfo | null;
  return { httpStatus: res.status, data };
}

export async function checkAccount(
  idInstance: string,
  apiTokenInstance: string,
  phoneNumber: number,
) {
  const res = await fetch(
    `${apiURL}/waInstance${idInstance}/checkAccount/${apiTokenInstance}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phoneNumber }),
      cache: "no-store",
    },
  );

  const data = (await res.json().catch(() => null)) as CheckAccountResult | null;
  return { httpStatus: res.status, data };
}

type QuotaStatus = {
  used?: string | number;
  total?: string | number;
  status?: string;
  description?: string;
};

export type SendMessageResult = {
  idMessage?: string;
  message?: string;
  error?: string;
  reason?: string;
  invokeStatus?: QuotaStatus;
  correspondentsStatus?: QuotaStatus;
  quotaData?: QuotaStatus;
};

export function allowedChatIdsFromDescription(description: string) {
  const matches = description.match(/\d+@(?:c\.us|lid)/g) ?? [];
  const unique = [...new Set(matches)];
  const phoneChats = unique.filter((id) => id.endsWith("@c.us"));
  const phoneDigits = new Set(phoneChats.map((id) => id.slice(0, -"@c.us".length)));
  const lidChats = unique.filter((id) => {
    if (!id.endsWith("@lid")) {
      return false;
    }
    return !phoneDigits.has(id.slice(0, -"@lid".length));
  });
  return [...phoneChats, ...lidChats];
}

export function sendMessageError(httpStatus: number, data: SendMessageResult | null) {
  const quotas = [data?.invokeStatus, data?.correspondentsStatus, data?.quotaData];
  const exceeded = quotas.find((item) => item?.status?.includes("EXCEED"));
  if (httpStatus !== 466 && !exceeded) {
    return null;
  }

  const quota = exceeded ?? quotas.find((item) => item?.description);
  const usage =
    quota?.used != null && quota?.total != null ? ` Использовано ${quota.used} из ${quota.total}.` : "";
  const allowedChatIds = allowedChatIdsFromDescription(
    quotas.map((item) => item?.description ?? "").join(" "),
  );
  const hint = allowedChatIds.length
    ? " Писать можно только в уже открытые чаты."
    : " Отправка в новый чат недоступна, пока тариф не будет изменён в личном кабинете GREEN-API.";

  return {
    error: `Лимит тарифа Разработчик исчерпан.${usage}${hint}`,
    allowedChatIds,
  };
}

export async function sendMessage(
  idInstance: string,
  apiTokenInstance: string,
  chatId: string,
  message: string,
) {
  const res = await fetch(
    `${apiURL}/waInstance${idInstance}/sendMessage/${apiTokenInstance}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId, message }),
      cache: "no-store",
    },
  );

  const data = (await res.json().catch(() => null)) as SendMessageResult | null;
  return { httpStatus: res.status, data };
}

export type IncomingNotification = {
  chatId: string;
  text: string;
  idMessage?: string;
  senderName?: string;
};

type NotificationBody = {
  typeWebhook?: string;
  idMessage?: string;
  senderData?: {
    chatId?: string;
    sender?: string;
    senderName?: string;
    chatName?: string;
  };
  messageData?: {
    typeMessage?: string;
    textMessageData?: { textMessage?: string };
    extendedTextMessageData?: { text?: string };
  };
};

export type ReceiveNotificationResult = {
  receiptId?: number;
  body?: NotificationBody;
  message?: string;
  error?: string;
  reason?: string;
};

function incomingText(body: NotificationBody) {
  const message = body.messageData;
  if (message?.textMessageData?.textMessage) {
    return message.textMessageData.textMessage;
  }
  if (message?.extendedTextMessageData?.text) {
    return message.extendedTextMessageData.text;
  }
  if (message?.typeMessage) {
    return `[${message.typeMessage}]`;
  }
  return null;
}

export function incomingFromNotification(body: NotificationBody | undefined): IncomingNotification | null {
  if (!body || body.typeWebhook !== "incomingMessageReceived") {
    return null;
  }
  const text = incomingText(body);
  const chatId = body.senderData?.chatId || body.senderData?.sender;
  if (!text || !chatId) {
    return null;
  }
  return {
    chatId,
    text,
    idMessage: body.idMessage,
    senderName: body.senderData?.senderName || body.senderData?.chatName,
  };
}

export async function receiveNotification(idInstance: string, apiTokenInstance: string) {
  const res = await fetch(
    `${apiURL}/waInstance${idInstance}/receiveNotification/${apiTokenInstance}?receiveTimeout=5`,
    { cache: "no-store" },
  );
  const raw = await res.text();
  if (!raw) {
    return { httpStatus: res.status, data: null as ReceiveNotificationResult | null };
  }
  try {
    return {
      httpStatus: res.status,
      data: JSON.parse(raw) as ReceiveNotificationResult,
    };
  } catch {
    return { httpStatus: res.status, data: null };
  }
}

export async function ensureIncomingWebhook(idInstance: string, apiTokenInstance: string) {
  const current = await fetch(
    `${apiURL}/waInstance${idInstance}/getSettings/${apiTokenInstance}`,
    { cache: "no-store" },
  );
  const settings = (await current.json().catch(() => null)) as {
    webhookUrl?: string;
    incomingWebhook?: string;
  } | null;

  if (!current.ok || !settings) {
    return { ok: false, changed: false };
  }
  if (settings.incomingWebhook === "yes" && !settings.webhookUrl) {
    return { ok: true, changed: false };
  }

  const saved = await fetch(
    `${apiURL}/waInstance${idInstance}/setSettings/${apiTokenInstance}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...settings,
        webhookUrl: "",
        incomingWebhook: "yes",
      }),
      cache: "no-store",
    },
  );
  return { ok: saved.ok, changed: saved.ok };
}

export async function deleteNotification(
  idInstance: string,
  apiTokenInstance: string,
  receiptId: number,
) {
  const res = await fetch(
    `${apiURL}/waInstance${idInstance}/deleteNotification/${apiTokenInstance}/${receiptId}`,
    { method: "DELETE", cache: "no-store" },
  );
  return res.ok;
}
