"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { CheckAccountResult, IncomingNotification, SendMessageResult } from "@/lib/green-api";

type SendResponse = SendMessageResult & {
  allowedChatIds?: string[];
};

type ChatItem = {
  text: string;
  idMessage?: string;
  error?: string;
  incoming?: boolean;
  chatId?: string;
  senderName?: string;
};

function resultText(data: CheckAccountResult) {
  if (data.exist === true) {
    const cache = data.fromCache ? "из кеша" : "с сервера";
    return `Аккаунт найден. Данные ${cache}.`;
  }
  if (data.exist === false) {
    return "Аккаунт на этом номере не найден.";
  }
  if (data.reason === "User get contact info limit reached") {
    return "Лимит проверок номеров. Подождите около 2 часов и повторите запрос.";
  }
  if (data.reason) {
    return data.reason;
  }
  return data.message || data.error || "Не удалось проверить номер";
}

type ContactCard = {
  name: string;
  phone: string;
  avatar?: string;
};

function formatChatPhone(chatId: string) {
  const digits = chatId.replace(/@(c\.us|lid)$/, "").replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("7")) {
    return `+7 ${formatLocal(digits.slice(1), "ru")}`;
  }
  if (digits.length === 12 && digits.startsWith("375")) {
    return `+375 ${formatLocal(digits.slice(3), "by")}`;
  }
  return "";
}

function isChatId(value: string) {
  return /^\d{1,20}(@(c\.us|lid))?$/.test(value);
}

function contactTitle(contact: ContactCard | undefined, fallback: string) {
  if (contact?.name) {
    return contact.name;
  }
  if (fallback && !isChatId(fallback)) {
    return fallback;
  }
  return contact?.phone || formatChatPhone(fallback) || "Контакт";
}

const countries = [
  { code: "ru", name: "Россия", dial: "7", length: 10, placeholder: "999 123 45 67" },
  { code: "by", name: "Беларусь", dial: "375", length: 9, placeholder: "29 123 45 67" },
] as const;

type Country = (typeof countries)[number];

function formatLocal(digits: string, code: string) {
  const parts =
    code === "ru"
      ? [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 8), digits.slice(8, 10)]
      : [digits.slice(0, 2), digits.slice(2, 5), digits.slice(5, 7), digits.slice(7, 9)];
  return parts.filter(Boolean).join(" ");
}

function CreateChatForm({
  phoneNumber,
  country,
  pending,
  message,
  tone,
  onCountryChange,
  onPhoneNumberChange,
  onSubmit,
  onClose,
}: {
  phoneNumber: string;
  country: Country;
  pending: boolean;
  message: string | null;
  tone: "ok" | "miss" | "error";
  onCountryChange: (country: Country) => void;
  onPhoneNumberChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
}) {
  const [countriesOpen, setCountriesOpen] = useState(false);
  const digits = phoneNumber.replace(/\D/g, "");
  const ready = digits.length === country.length && !pending;

  return (
    <form
      onSubmit={onSubmit}
      className="relative w-full max-w-[400px] overflow-hidden rounded-[28px] bg-[#17181c] text-white shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-40"
        style={{
          background:
            "radial-gradient(90% 80% at 18% 0%, rgba(124, 58, 180, 0.55), transparent 58%), radial-gradient(80% 90% at 82% 0%, rgba(20, 90, 180, 0.55), transparent 60%)",
        }}
      />
      <div className="relative flex flex-col items-center px-7 pt-14 pb-8 text-center">
        <button
          type="button"
          onClick={onClose}
          aria-label="Закрыть"
          className="absolute top-4 right-4 grid size-9 place-items-center rounded-full text-white/80"
        >
          ×
        </button>
        <h1 className="mb-7 text-xl font-semibold">Введите номер телефона</h1>
        <div className="relative w-full">
          <label className="dark-field flex h-14 items-center rounded-2xl bg-white/8 pr-4 text-left">
            <button
              type="button"
              onClick={() => setCountriesOpen((open) => !open)}
              className="flex h-full shrink-0 items-center gap-2 border-r border-white/10 px-4 font-medium"
              aria-expanded={countriesOpen}
              aria-label={`Код страны, ${country.name}`}
            >
              <span>+{country.dial}</span>
              <span className="text-[10px] text-white/60">▾</span>
            </button>
            <input
              name="phoneNumber"
              inputMode="numeric"
              autoComplete="tel"
              required
              value={formatLocal(digits, country.code)}
              onChange={(event) => {
                let next = event.target.value.replace(/\D/g, "");
                if (next.startsWith(country.dial) && next.length > country.length) {
                  next = next.slice(country.dial.length);
                }
                onPhoneNumberChange(next.slice(0, country.length));
              }}
              placeholder={country.placeholder}
              aria-label="Номер телефона"
              className="min-w-0 flex-1 bg-transparent px-4 text-[17px] tracking-wide text-white outline-none placeholder:tracking-normal placeholder:text-white/35"
            />
          </label>
          {countriesOpen ? (
            <div className="absolute top-14 left-0 z-10 w-full rounded-2xl bg-[#2c2d33] p-1.5 shadow-[0_16px_48px_rgba(0,0,0,0.45)]">
              {countries.map((item) => (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => {
                    onCountryChange(item);
                    setCountriesOpen(false);
                  }}
                  className="flex w-full items-center justify-between rounded-[10px] px-2.5 py-2.5 text-left hover:bg-white/6"
                >
                  <span>{item.name}</span>
                  <span className="text-white/55">+{item.dial}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <p className="mt-2.5 px-1 text-center text-[13px] leading-snug text-white/40">
          Код страны уже выбран. Для России введите номер с 999. Частые проверки одного номера
          могут ограничить инстанс.
        </p>
        {message ? (
          <p
            className={
              tone === "ok"
                ? "mt-3 text-sm text-green-400"
                : tone === "error"
                  ? "mt-3 text-sm text-red-400"
                  : "mt-3 text-sm text-white/70"
            }
          >
            {message}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={!ready}
          className="mt-5 h-[60px] w-full max-w-[360px] rounded-[20px] bg-white/10 text-[17px] font-medium text-white/30 enabled:bg-white enabled:text-[#17181c] enabled:cursor-pointer disabled:cursor-default"
        >
          {pending ? "Проверка..." : "Продолжить"}
        </button>
      </div>
    </form>
  );
}

function ChatForm({
  chatId,
  contact,
  items,
  draft,
  sending,
  receiveHint,
  receiveError,
  onDraftChange,
  onSend,
  onBack,
}: {
  chatId: string | null;
  contact: ContactCard | null;
  items: ChatItem[];
  draft: string;
  sending: boolean;
  receiveHint: string | null;
  receiveError: string | null;
  onDraftChange: (value: string) => void;
  onSend: (event: FormEvent<HTMLFormElement>) => void;
  onBack: () => void;
}) {
  const visible = items.filter((item) => item.incoming || !item.chatId || item.chatId === chatId);

  return (
    <section className="relative flex h-full min-h-0 min-w-0 flex-1 flex-col bg-[#1a1c22] bg-[url('/pattern.svg')] bg-[length:280px_280px] text-white">
      <header className="flex h-[60px] shrink-0 items-center gap-2.5 bg-[rgba(22,24,30,0.92)] px-4 backdrop-blur">
        <button
          type="button"
          onClick={onBack}
          aria-label="К списку чатов"
          className="grid size-9 place-items-center rounded-full text-[#4c8dff] lg:hidden"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-5">
            <path d="M15 6 9 12l6 6" />
          </svg>
        </button>
        {chatId ? (
          contact?.avatar ? (
            <img
              src={contact.avatar}
              alt=""
              className="size-10 shrink-0 rounded-2xl object-cover"
            />
          ) : (
            <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[#2f7bff] text-sm font-bold">
              {(contact?.name || contact?.phone || "?").replace(/\D/g, "").slice(-2) ||
                (contact?.name || "?").slice(0, 1)}
            </span>
          )
        ) : null}
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-bold">
            {chatId ? contact?.name || contact?.phone || "Контакт" : "Чат"}
          </h2>
          <p className="truncate text-[13px] text-[#8e94a3]">
            {chatId ? (contact?.name ? contact.phone : "Личный чат") : "Сначала укажите номер"}
          </p>
        </div>
        <a href="/api/session" className="text-sm font-medium text-[#4c8dff] lg:hidden">
          Выйти
        </a>
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto px-[8%] pt-4 pb-28">
        {receiveHint ? <p className="self-center text-sm text-[#c5c8d2]">{receiveHint}</p> : null}
        {receiveError ? <p className="self-center text-sm text-red-300">{receiveError}</p> : null}
        {visible.length === 0 ? (
          <p className="self-center rounded-[10px] bg-black/35 px-2.5 py-1 text-[13px] text-[#c5c8d2]">
            Сообщений пока нет
          </p>
        ) : (
          visible.map((item, index) => (
            <div
              key={`${item.idMessage ?? "err"}-${index}`}
              className={`flex max-w-[min(520px,86%)] flex-col ${item.incoming ? "self-start" : "self-end"}`}
            >
              {item.incoming && item.senderName ? (
                <p className="mb-1 text-xs text-[#8e94a3]">{item.senderName}</p>
              ) : null}
              <div
                className={`px-3 py-2.5 text-[15px] leading-snug shadow-sm ${
                  item.incoming
                    ? "rounded-[16px] rounded-bl-[6px] bg-[#2c3140]"
                    : "rounded-[16px] rounded-br-[6px] bg-[#6d46e4]"
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{item.text}</p>
                {item.error ? <p className="mt-1 text-xs text-red-200">{item.error}</p> : null}
              </div>
            </div>
          ))
        )}
      </div>
      <form
        onSubmit={onSend}
        className="absolute bottom-4 left-1/2 flex h-[52px] w-[min(720px,calc(100%-48px))] -translate-x-1/2 items-center gap-1.5 rounded-2xl bg-[#2a2d36] px-2 shadow-[0_8px_24px_rgba(0,0,0,0.25)]"
      >
        <input
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          maxLength={4000}
          disabled={!chatId}
          placeholder="Сообщение"
          aria-label="Сообщение"
          className="min-w-0 flex-1 bg-transparent px-2 text-base text-white outline-none placeholder:text-[#8e94a3] disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!chatId || sending || !draft.trim()}
          aria-label="Отправить"
          className="grid size-9 place-items-center rounded-[10px] text-white disabled:text-[#9aa0ae]"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="9" className={draft.trim() && chatId ? "fill-[#4c8dff]" : "fill-transparent"} />
            <path d="M12 16V8m0 0-2.4 2.4M12 8l2.4 2.4" fill="none" stroke="currentColor" strokeWidth="1.7" />
          </svg>
        </button>
      </form>
    </section>
  );
}

function ChatList({
  chats,
  activeId,
  onOpen,
  onCreate,
}: {
  chats: { id: string; title: string; preview: string; avatar?: string }[];
  activeId: string | null;
  onOpen: (id: string) => void;
  onCreate: () => void;
}) {
  return (
    <aside className="flex h-full w-full shrink-0 flex-col bg-[#1c1e25] text-white lg:w-[360px] lg:border-r lg:border-white/6">
      <div className="flex h-[60px] items-center gap-2.5 px-4">
        <h1 className="flex-1 text-xl font-bold">Чаты</h1>
        <button
          type="button"
          onClick={onCreate}
          aria-label="Новый чат"
          className="grid size-9 place-items-center rounded-full text-[#4c8dff]"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-5">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        {chats.length === 0 ? (
          <p className="px-4 text-sm text-[#8e94a3]">Чатов пока нет</p>
        ) : (
          chats.map((chat) => (
            <button
              key={chat.id}
              type="button"
              onClick={() => onOpen(chat.id)}
              className={`grid w-full grid-cols-[52px_1fr] gap-x-2.5 px-3.5 py-2.5 text-left ${
                chat.id === activeId ? "bg-[#2c3140]" : ""
              }`}
            >
              {chat.avatar ? (
                <img
                  src={chat.avatar}
                  alt=""
                  className="row-span-2 size-[52px] rounded-2xl object-cover"
                />
              ) : (
                <span className="row-span-2 grid size-[52px] place-items-center rounded-2xl bg-[#2f7bff] text-base font-bold">
                  {chat.title.replace(/\D/g, "").slice(-2) || chat.title.slice(0, 1) || "•"}
                </span>
              )}
              <span className="truncate text-base font-semibold">{chat.title}</span>
              <span className="truncate text-[13px] text-[#8e94a3]">{chat.preview || "Нет сообщений"}</span>
            </button>
          ))
        )}
      </div>
      <a
        href="/api/session"
        className="m-3 flex h-11 items-center justify-center rounded-2xl bg-white/8 text-sm font-medium text-white/80"
      >
        Выйти
      </a>
    </aside>
  );
}

export function CheckAccountForm() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [country, setCountry] = useState<Country>(countries[0]);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<"ok" | "miss" | "error">("miss");
  const [chatId, setChatId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [items, setItems] = useState<ChatItem[]>([]);
  const [allowedChatIds, setAllowedChatIds] = useState<string[]>([]);
  const [chats, setChats] = useState<{ id: string; title: string; preview: string; avatar?: string }[]>([]);
  const [contacts, setContacts] = useState<Record<string, ContactCard>>({});
  const [showThread, setShowThread] = useState(false);
  const [receiveError, setReceiveError] = useState<string | null>(null);
  const [receiveHint, setReceiveHint] = useState<string | null>(null);
  const chatIdRef = useRef(chatId);
  chatIdRef.current = chatId;
  const contactLoads = useRef(new Set<string>());

  function rememberContact(id: string, phone: string, name = "", avatar = "") {
    setContacts((current) => {
      if (current[id]?.name && !name) {
        return current;
      }
      return {
        ...current,
        [id]: { name: name || current[id]?.name || "", phone, avatar: avatar || current[id]?.avatar },
      };
    });
  }

  useEffect(() => {
    const ids = [
      ...chats.map((chat) => chat.id),
      ...allowedChatIds,
      ...(chatId ? [chatId] : []),
    ];
    for (const id of ids) {
      if (!isChatId(id) || contactLoads.current.has(id)) {
        continue;
      }
      contactLoads.current.add(id);
      void fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId: id }),
      })
        .then(async (res) => {
          const data = (await res.json()) as { name?: string; phone?: string; avatar?: string };
          if (!res.ok) {
            return;
          }
          setContacts((current) => ({
            ...current,
            [id]: {
              name: data.name || current[id]?.name || "",
              phone: data.phone || current[id]?.phone || formatChatPhone(id),
              avatar: data.avatar || current[id]?.avatar,
            },
          }));
        })
        .catch(() => {
          contactLoads.current.delete(id);
        });
    }
  }, [allowedChatIds, chatId, chats]);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      while (!cancelled) {
        try {
          const started = Date.now();
          const res = await fetch("/api/notifications");
          const data = (await res.json()) as {
            notification?: IncomingNotification | null;
            error?: string;
            hint?: string;
          };
          if (cancelled) {
            return;
          }
          if (!res.ok) {
            setReceiveError(data.error || "Не удалось получить сообщения");
            await new Promise((resolve) => setTimeout(resolve, 15000));
            continue;
          }
          setReceiveError(null);
          if (data.hint) {
            setReceiveHint(data.hint);
          }
          const notification = data.notification;
          if (!notification) {
            const wait = Math.max(0, 5000 - (Date.now() - started));
            if (wait > 0) {
              await new Promise((resolve) => setTimeout(resolve, wait));
            }
            continue;
          }
          setItems((current) => {
            if (
              notification.idMessage &&
              current.some((item) => item.idMessage === notification.idMessage)
            ) {
              return current;
            }
            return [
              ...current,
              {
                text: notification.text,
                idMessage: notification.idMessage,
                incoming: true,
                chatId: notification.chatId,
                senderName: notification.senderName,
              },
            ];
          });
          setChats((current) => {
            const title = notification.senderName || formatChatPhone(notification.chatId);
            const existing = current.find((chat) => chat.id === notification.chatId);
            if (!existing) {
              return [{ id: notification.chatId, title, preview: notification.text }, ...current];
            }
            return current.map((chat) =>
              chat.id === notification.chatId
                ? { ...chat, title: chat.title || title, preview: notification.text }
                : chat,
            );
          });
          if (!chatIdRef.current) {
            setChatId(notification.chatId);
            setShowThread(true);
          }
          setReceiveHint(null);
        } catch {
          if (!cancelled) {
            setReceiveError("Не удалось получить сообщения");
            await new Promise((resolve) => setTimeout(resolve, 5000));
          }
        }
      }
    }

    void poll();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);

    try {
      const digits = phoneNumber.replace(/\D/g, "");
      const normalized = `${country.dial}${digits}`;
      const res = await fetch("/api/check-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: normalized }),
      });
      const data = (await res.json()) as CheckAccountResult;
      setTone(data.exist === true ? "ok" : data.exist === false ? "miss" : "error");
      setMessage(resultText(data));
      if (data.exist === true && data.chatId) {
        const phone = `+${country.dial} ${formatLocal(digits, country.code)}`;
        rememberContact(data.chatId, phone);
        const title = phone;
        setChats((current) => {
          if (current.some((chat) => chat.id === data.chatId)) {
            return current.map((chat) =>
              chat.id === data.chatId ? { ...chat, title } : chat,
            );
          }
          return [{ id: data.chatId!, title, preview: "" }, ...current];
        });
        setChatId(data.chatId);
        setDraft("");
        setCreating(false);
        setShowThread(true);
      }
    } catch {
      setTone("error");
      setChatId(null);
      setMessage("Не удалось проверить номер");
    } finally {
      setPending(false);
    }
  }

  async function onSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!chatId || !draft.trim() || sending) {
      return;
    }

    const text = draft;
    setSending(true);
    try {
      const res = await fetch("/api/send-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId, message: text }),
      });
      const data = (await res.json()) as SendResponse;
      if (data.allowedChatIds?.length) {
        setAllowedChatIds(data.allowedChatIds);
      }
      if (!res.ok || !data.idMessage) {
        setItems((current) => [
          ...current,
          {
            text,
            chatId,
            error: data.message || data.error || data.reason || "Сообщение не отправлено",
          },
        ]);
        return;
      }
      setItems((current) => [
        ...current,
        { text, idMessage: data.idMessage, chatId },
      ]);
      setChats((current) =>
        current.map((chat) => (chat.id === chatId ? { ...chat, preview: text } : chat)),
      );
      setDraft("");
    } catch {
      setItems((current) => [...current, { text, chatId, error: "Сообщение не отправлено" }]);
    } finally {
      setSending(false);
    }
  }

  function openChat(id: string) {
    setChatId(id);
    setDraft("");
    setTone("ok");
    setMessage(null);
    setCreating(false);
    setShowThread(true);
  }

  const listedChats = [
    ...chats,
    ...allowedChatIds
      .filter((id) => !chats.some((chat) => chat.id === id))
      .map((id) => ({ id, title: formatChatPhone(id), preview: "" })),
  ].map((chat) => {
    const contact = contacts[chat.id];
    const last = [...items].reverse().find((item) => item.chatId === chat.id);
    return {
      ...chat,
      title: contactTitle(contact, chat.title),
      avatar: contact?.avatar,
      preview: last?.text || chat.preview,
    };
  });
  const activeRow = chatId ? listedChats.find((chat) => chat.id === chatId) : undefined;
  const activeContact = chatId
    ? {
        name:
          contacts[chatId]?.name ||
          (activeRow && activeRow.title !== "Контакт" && !activeRow.title.startsWith("+")
            ? activeRow.title
            : ""),
        phone:
          contacts[chatId]?.phone ||
          (activeRow?.title.startsWith("+") ? activeRow.title : formatChatPhone(chatId)),
        avatar: contacts[chatId]?.avatar,
      }
    : null;

  return (
    <div className="relative flex h-dvh w-full bg-[#12141a]">
      <div className={`${showThread ? "hidden lg:flex" : "flex"} min-h-0`}>
        <ChatList
          chats={listedChats}
          activeId={chatId}
          onOpen={openChat}
          onCreate={() => {
            setPhoneNumber("");
            setMessage(null);
            setCreating(true);
          }}
        />
      </div>
      <div className={`${showThread ? "flex" : "hidden lg:flex"} min-w-0 flex-1`}>
        <ChatForm
          chatId={chatId}
          contact={activeContact}
          items={items}
          draft={draft}
          sending={sending}
          receiveHint={receiveHint}
          receiveError={receiveError}
          onDraftChange={setDraft}
          onSend={onSend}
          onBack={() => setShowThread(false)}
        />
      </div>
      {creating ? (
        <div className="absolute inset-0 z-20 grid place-items-center bg-black/55 p-6">
          <CreateChatForm
            phoneNumber={phoneNumber}
            country={country}
            pending={pending}
            message={message}
            tone={tone}
            onCountryChange={(next) => {
              setCountry(next);
              setPhoneNumber("");
            }}
            onPhoneNumberChange={setPhoneNumber}
            onSubmit={onSubmit}
            onClose={() => setCreating(false)}
          />
        </div>
      ) : null}
    </div>
  );
}
