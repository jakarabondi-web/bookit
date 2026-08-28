import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getSessionUser } from "@/server/auth/current-user";
import { LoginForm } from "@/components/auth/login-form";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Log in" };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await getSessionUser();
  if (session) redirect("/account");

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-16">
      <div className="text-center">
        <Link href="/" className="text-2xl font-bold text-ink">
          bookit<span className="text-primary">.</span>
        </Link>
        <h1 className="mt-4 text-xl font-semibold text-ink">Welcome back</h1>
        <p className="mt-1 text-sm text-muted">Log in to manage your tickets and bookings.</p>
      </div>
      <Card>
        <CardContent className="p-6">
          <Suspense>
            <LoginForm />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
