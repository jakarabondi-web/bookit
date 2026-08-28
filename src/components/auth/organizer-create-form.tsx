"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TYPES: { value: string; label: string }[] = [
  { value: "INDIVIDUAL", label: "Individual" },
  { value: "BUSINESS", label: "Business" },
  { value: "NONPROFIT", label: "Nonprofit" },
  { value: "COMMUNITY_ORGANIZATION", label: "Community organization" },
  { value: "CHURCH", label: "Church" },
  { value: "ASSOCIATION", label: "Association" },
  { value: "SPORTS_ORGANIZATION", label: "Sports organization" },
];

export function OrganizerCreateForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [type, setType] = useState("BUSINESS");
  const [about, setAbout] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [supportPhone, setSupportPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/organizers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          type,
          about: about.trim() || undefined,
          supportEmail,
          supportPhone,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload?.error?.message ?? "Could not create your organizer profile");
        return;
      }
      router.push("/organizer");
      router.refresh();
    } catch {
      setError("We could not reach Bookit. Check your connection.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <Field label="Organizer name" htmlFor="org-name">
        <Input
          id="org-name"
          placeholder="e.g. Soundcity Live"
          value={name}
          onChange={(changeEvent) => setName(changeEvent.target.value)}
          required
        />
      </Field>

      <Field label="Type" htmlFor="org-type">
        <Select value={type} onValueChange={setType}>
          <SelectTrigger id="org-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TYPES.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label="About" htmlFor="org-about" hint="Optional — a line or two for your public profile.">
        <Textarea
          id="org-about"
          value={about}
          onChange={(changeEvent) => setAbout(changeEvent.target.value)}
          rows={3}
        />
      </Field>

      <Field label="Support email" htmlFor="org-email">
        <Input
          id="org-email"
          type="email"
          value={supportEmail}
          onChange={(changeEvent) => setSupportEmail(changeEvent.target.value)}
          required
        />
      </Field>

      <Field label="Support phone" htmlFor="org-phone" hint="Shown to buyers who need help with an order.">
        <Input
          id="org-phone"
          type="tel"
          placeholder="0712 345 678"
          value={supportPhone}
          onChange={(changeEvent) => setSupportPhone(changeEvent.target.value)}
          required
        />
      </Field>

      {error ? (
        <p role="alert" className="text-sm font-medium text-error">
          {error}
        </p>
      ) : null}

      <Button type="submit" size="lg" block disabled={busy}>
        {busy ? "Creating your organizer…" : "Create organizer"}
      </Button>
    </form>
  );
}
