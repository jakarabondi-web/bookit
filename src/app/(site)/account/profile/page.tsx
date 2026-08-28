import type { Metadata } from "next";
import { CheckCircle2, ShieldCheck, Smartphone } from "lucide-react";
import { getContainer } from "@/server/container";
import { currentUserId } from "@/server/auth/current-user";
import { DisableMfaButton, EnableMfaButton } from "@/components/account/mfa-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const { uow } = getContainer();
  const user = await uow.repos.users.findById(await currentUserId());
  if (!user) return null;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <Card>
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold text-ink">Your details</h2>
          <p className="mt-1 text-sm text-muted">
            Changing your email or phone number requires confirming your identity first.
          </p>

          <form className="mt-6 flex flex-col gap-5">
            <Field label="Full name" htmlFor="profile-name">
              <Input defaultValue={user.fullName} autoComplete="name" />
            </Field>

            <Field
              label="Email address"
              htmlFor="profile-email"
              hint={user.emailVerifiedAt ? "Verified" : "Not verified yet"}
            >
              <Input type="email" defaultValue={user.email} autoComplete="email" />
            </Field>

            <Field
              label="Phone number"
              htmlFor="profile-phone"
              hint="Used for M-PESA payments and event reminders."
            >
              <Input type="tel" defaultValue={user.phone ?? ""} autoComplete="tel" />
            </Field>

            <Field label="City" htmlFor="profile-city">
              <Input defaultValue={user.city ?? ""} />
            </Field>

            <div className="flex flex-wrap gap-3">
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
            <h2 className="text-lg font-semibold text-ink">Security</h2>

            <ul className="mt-4 flex flex-col gap-4">
              <li className="flex items-start gap-3">
                <CheckCircle2
                  className={user.emailVerifiedAt ? "mt-0.5 size-5 text-success" : "mt-0.5 size-5 text-muted"}
                  aria-hidden="true"
                />
                <div>
                  <p className="text-sm font-medium text-ink">Email verified</p>
                  <p className="text-xs text-muted">
                    {user.emailVerifiedAt ? formatDate(user.emailVerifiedAt) : "Not verified"}
                  </p>
                </div>
              </li>

              <li className="flex items-start gap-3">
                <Smartphone
                  className={user.phoneVerifiedAt ? "mt-0.5 size-5 text-success" : "mt-0.5 size-5 text-muted"}
                  aria-hidden="true"
                />
                <div>
                  <p className="text-sm font-medium text-ink">Phone verified</p>
                  <p className="text-xs text-muted">
                    {user.phoneVerifiedAt ? formatDate(user.phoneVerifiedAt) : "Not verified"}
                  </p>
                </div>
              </li>

              <li className="flex items-start gap-3">
                <ShieldCheck
                  className={user.mfaEnabled ? "mt-0.5 size-5 text-success" : "mt-0.5 size-5 text-warning"}
                  aria-hidden="true"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-ink">Two-factor authentication</p>
                  <p className="text-xs text-muted">
                    {user.mfaEnabled
                      ? "Enabled"
                      : "Off — required before you can sell high-value tickets."}
                  </p>
                  {user.mfaEnabled ? <DisableMfaButton /> : <EnableMfaButton />}
                </div>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-ink">Sessions & devices</h2>
            <p className="mt-1 text-sm text-muted">
              You can sign out of any device you no longer use.
            </p>
            <ul className="mt-4 flex flex-col gap-3">
              <li className="flex items-center justify-between gap-3 rounded-card-sm border border-line p-3">
                <div>
                  <p className="text-sm font-medium text-ink">Chrome on Android</p>
                  <p className="text-xs text-muted">Nairobi · Active now</p>
                </div>
                <Badge tone="success">This device</Badge>
              </li>
              <li className="flex items-center justify-between gap-3 rounded-card-sm border border-line p-3">
                <div>
                  <p className="text-sm font-medium text-ink">Safari on macOS</p>
                  <p className="text-xs text-muted">Nairobi · 3 days ago</p>
                </div>
                <Button size="sm" variant="ghost" disabled title="Not available yet">
                  Sign out
                </Button>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-ink">Notifications</h2>
            <ul className="mt-4 flex flex-col gap-3 text-sm text-ink-secondary">
              {[
                "Purchase and booking confirmations",
                "Event reminders",
                "Transfers and resale updates",
                "Refunds and payouts",
              ].map((item) => (
                <li key={item} className="flex items-center justify-between gap-3">
                  {item}
                  <Badge tone="success">Email + SMS</Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
