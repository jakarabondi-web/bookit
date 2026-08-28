import Link from "next/link";
import { getContainer } from "@/server/container";
import { currentUserId } from "@/server/auth/current-user";
import { initials } from "@/lib/format";
import { AccountNav } from "@/components/account/account-nav";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const container = getContainer();
  const user = await container.uow.repos.users.findById(await currentUserId());

  return (
    <div className="page-shell py-8 lg:py-12">
      <header className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex size-14 items-center justify-center rounded-full bg-primary-tint text-lg font-semibold text-primary">
            {initials(user?.fullName ?? "Bookit User")}
          </div>
          <div>
            <h1 className="text-xl font-bold text-ink lg:text-2xl">
              {user?.fullName ?? "Your account"}
            </h1>
            <p className="text-sm text-muted">
              {user?.email} · {user?.city ?? "Kenya"}
            </p>
          </div>
        </div>
        <Link
          href="/account/profile"
          className="text-sm font-medium text-primary hover:underline"
        >
          Edit profile
        </Link>
      </header>

      <div className="mt-6">
        <AccountNav />
      </div>

      <div className="mt-8">{children}</div>
    </div>
  );
}
