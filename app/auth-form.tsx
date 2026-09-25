const errors: Record<string, string> = {
  missing: "Введите idInstance и apiTokenInstance",
  unauthorized: "Инстанс не авторизован",
  failed: "Не удалось проверить инстанс",
};

export function AuthForm({ error }: { error?: string }) {
  const message = error ? errors[error] ?? "Не удалось войти" : null;

  return (
    <form
      action="/api/session"
      method="post"
      className="flex w-full max-w-[420px] flex-col gap-4 rounded-[28px] bg-[#17181c] px-7 py-10 text-white shadow-[0_4px_24px_rgba(0,0,0,0.28)]"
    >
      <h1 className="text-center text-xl font-semibold">Вход</h1>
      <label className="flex flex-col gap-1 text-sm text-white/55">
        idInstance
        <input
          name="idInstance"
          required
          autoComplete="username"
          className="h-[52px] rounded-2xl bg-white/10 px-3.5 text-base text-white outline-none"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-white/55">
        apiTokenInstance
        <input
          name="apiTokenInstance"
          type="password"
          required
          autoComplete="current-password"
          className="h-[52px] rounded-2xl bg-white/10 px-3.5 text-base text-white outline-none"
        />
      </label>
      {message ? <p className="text-sm text-red-300">{message}</p> : null}
      <button type="submit" className="h-[60px] rounded-[20px] bg-white text-[17px] font-medium text-[#17181c]">
        Войти
      </button>
    </form>
  );
}
