import { redirect } from "next/navigation";
import { LoginForm } from "./login-form";
import { getCurrentUser } from "@/lib/auth";
import { Logo } from "@/components/brand/logo";

export default async function LoginPage() {
  const existing = await getCurrentUser();
  if (existing) redirect("/dashboard");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-secondary via-background to-accent/40 p-6">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <Logo size="lg" />
          <p className="mt-2 text-sm text-muted-foreground italic">
            Freshness you can get · Service you can trust
          </p>
        </div>
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h1 className="text-lg font-semibold">Back Office sign in</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter your credentials to continue.
          </p>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
