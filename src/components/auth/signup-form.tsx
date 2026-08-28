"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";

export function SignupForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          email,
          phone: phone.trim() || undefined,
          password,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload?.error?.message ?? "Could not create your account");
        return;
      }
      router.push("/account");
      router.refresh();
    } catch {
      setError("We could not reach Bookit. Check your connection.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <Field label="Full name" htmlFor="signup-name">
        <Input
          id="signup-name"
          autoComplete="name"
          value={fullName}
          onChange={(changeEvent) => setFullName(changeEvent.target.value)}
          required
        />
      </Field>

      <Field label="Email address" htmlFor="signup-email">
        <Input
          id="signup-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(changeEvent) => setEmail(changeEvent.target.value)}
          required
        />
      </Field>

      <Field label="Phone number" htmlFor="signup-phone" hint="Optional — used for M-PESA and event reminders.">
        <Input
          id="signup-phone"
          type="tel"
          autoComplete="tel"
          placeholder="0712 345 678"
          value={phone}
          onChange={(changeEvent) => setPhone(changeEvent.target.value)}
        />
      </Field>

      <Field label="Password" htmlFor="signup-password" hint="At least 8 characters.">
        <Input
          id="signup-password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          value={password}
          onChange={(changeEvent) => setPassword(changeEvent.target.value)}
          required
        />
      </Field>

      {error ? (
        <p role="alert" className="text-sm font-medium text-error">
          {error}
        </p>
      ) : null}

      <Button type="submit" size="lg" block disabled={busy}>
        {busy ? "Creating your account…" : "Create account"}
      </Button>

      <p className="text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:text-primary-hover">
          Log in
        </Link>
      </p>
    </form>
  );
}
