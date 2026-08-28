import type { Metadata } from "next";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import { getContainer } from "@/server/container";
import { currentOrganizerId } from "@/server/auth/current-user";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/input";

export const metadata: Metadata = { title: "Settings" };

const KYC_FIELDS = [
  "Registered legal name",
  "KRA PIN",
  "Business registration certificate",
  "Director / owner ID or passport",
  "Settlement account details",
  "Beneficial owners over 25%",
];

export default async function OrganizerSettingsPage() {
  const { catalog } = getContainer();
  const organizerId = await currentOrganizerId();
  const organizer = await catalog.organizer(organizerId);

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-2xl font-bold text-ink">Settings</h1>
        <p className="mt-1 text-sm text-muted">
          Your public organizer profile, verification and settlement details.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-ink">Public profile</h2>
            <p className="mt-1 text-sm text-muted">
              This is what attendees see on your event pages.
            </p>

            <form className="mt-6 flex flex-col gap-5">
              <Field label="Organizer name" htmlFor="org-name" required>
                <Input defaultValue={organizer.name} />
              </Field>
              <Field
                label="Bookit URL"
                htmlFor="org-slug"
                hint={`bookit.co.ke/o/${organizer.slug}`}
              >
                <Input defaultValue={organizer.slug} />
              </Field>
              <Field label="About" htmlFor="org-about">
                <Textarea rows={4} defaultValue={organizer.about} />
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Support email" htmlFor="org-email" required>
                  <Input type="email" defaultValue={organizer.supportEmail} />
                </Field>
                <Field label="Support phone" htmlFor="org-phone" required>
                  <Input type="tel" defaultValue={organizer.supportPhone} />
                </Field>
              </div>
              <div className="flex gap-3">
                <Button type="submit">Save changes</Button>
                <Button type="button" variant="secondary">
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-lg font-semibold text-ink">Verification</h2>
                <Badge
                  tone={
                    organizer.verification === "VERIFIED"
                      ? "success"
                      : organizer.verification === "PENDING"
                        ? "warning"
                        : "neutral"
                  }
                >
                  {organizer.verification.toLowerCase()}
                </Badge>
              </div>
              <p className="mt-2 text-sm text-ink-secondary">
                Organizer type: <strong>{organizer.type.replace(/_/g, " ").toLowerCase()}</strong>
              </p>

              <ul className="mt-4 flex flex-col gap-2">
                {KYC_FIELDS.map((field) => (
                  <li key={field} className="flex items-center gap-2 text-sm text-ink-secondary">
                    <ShieldCheck className="size-4 shrink-0 text-success" aria-hidden="true" />
                    {field}
                  </li>
                ))}
              </ul>

              <p className="mt-4 text-xs leading-relaxed text-muted">
                KYC documents are encrypted at rest and access to them is restricted and audited.
                Nobody at Bookit can read them without leaving a record.
              </p>
            </CardContent>
          </Card>

          <Card className="border-warning/25 bg-warning-tint/40">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden="true" />
                <div>
                  <h2 className="text-base font-semibold text-ink">Settlement account</h2>
                  <p className="mt-1 text-sm text-ink-secondary">
                    Changing where your money is sent is the highest-risk action on the platform.
                    It requires confirming your identity, notifies your existing contacts, and
                    holds payouts for a cooling period.
                  </p>
                  <Button size="sm" variant="secondary" disabled title="Not available yet" className="mt-4">
                    Change settlement account
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
