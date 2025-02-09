import { LoginForm } from "@/features/auth/components/login-form";

export default function LoginPage() {
  return (
    <main className="bg-muted/40 flex min-h-screen items-center justify-center p-6">
      <div className="bg-card w-full max-w-sm rounded-xl border p-6 shadow-sm">
        <div className="mb-6">
          <h1 className="text-xl font-semibold">MMS — Depot Manager</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Sign in to continue.
          </p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
