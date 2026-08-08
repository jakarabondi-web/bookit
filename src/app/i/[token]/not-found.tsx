import Link from "next/link";
import { MailQuestion } from "lucide-react";

/**
 * Shown for an invitation link that does not resolve — unknown, revoked, or
 * for an event that is not private. It deliberately says nothing about whether
 * the event exists.
 */
export default function InvitationNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#FBF7F0] px-6 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-[#F5EDDF] text-[#B08544]">
        <MailQuestion className="size-6" aria-hidden="true" />
      </span>
      <h1
        className="mt-6 text-3xl text-[#2B241B]"
        style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}
      >
        This invitation link is not valid
      </h1>
      <p className="mt-4 max-w-md text-sm leading-relaxed text-[#6B6053]">
        The link may have expired, been withdrawn, or been mistyped. Invitation links are personal
        — check the message the hosts sent you, and copy the whole link.
      </p>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-[#6B6053]">
        If you believe you should have an invitation, please contact the hosts directly.
      </p>
      <Link
        href="/"
        className="mt-8 rounded-xl border border-[#B08544] px-5 py-2.5 text-sm font-medium text-[#B08544] transition-colors hover:bg-[#F5EDDF]"
      >
        Go to Bookit
      </Link>
    </div>
  );
}
