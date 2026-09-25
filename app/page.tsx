import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AuthForm } from "./auth-form";
import { CheckAccountForm } from "./check-account-form";
import { getStateInstance } from "@/lib/green-api";
import { verifySession } from "@/lib/session";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  const credentials = token ? verifySession(token) : null;

  if (!credentials) {
    return (
      <main className="flex min-h-dvh flex-1 items-center justify-center bg-[#25262d] bg-[url('/pattern.svg')] bg-[length:280px_280px] px-6 font-sans">
        <AuthForm error={error} />
      </main>
    );
  }

  const data = await getStateInstance(
    credentials.idInstance,
    credentials.apiTokenInstance,
  );
  if (data.stateInstance && data.stateInstance !== "authorized") {
    redirect("/api/session?error=unauthorized");
  }

  return (
    <main className="flex min-h-dvh flex-1 font-sans">
      <CheckAccountForm />
    </main>
  );
}
