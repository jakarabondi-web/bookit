import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/server/auth/current-user";
import { SignupForm } from "@/components/auth/signup-form";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Sign up" };
export const dynamic = "force-dynamic";

export default async function SignupPage() {
  const session = await getSessionUser();
  if (session) redirect("/account");

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-16">
      <div className="text-center">
        <Link href="/" className="text-2xl font-bold text-ink">
          bookit<span className="text-primary">.</span>
        </Link>
        <h1 className="mt-4 text-xl font-semibold text-ink">Create your account</h1>
        <p className="mt-1 text-sm text-muted">
          Book events, manage tickets and get reminders — all in one place.
        </p>
      </div>
      <Card>
        <CardContent className="p-6">
          <SignupForm />
        </CardContent>
      </Card>
    </div>
  );
}
