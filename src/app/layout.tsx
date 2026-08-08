import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import "./globals.css";

/**
 * Type pairing.
 *
 * Inter carries the interface — it is the most legible screen face at small
 * sizes and handles tabular figures, which matters on a platform full of prices
 * and seat counts. Plus Jakarta Sans carries display type: a geometric humanist
 * with the confident, slightly warm character premium marketplaces use for
 * headlines, and it holds up at 56px+ where Inter starts to feel utilitarian.
 *
 * Both are variable fonts, self-hosted by next/font — no third-party request,
 * no layout shift, and no CSP exception for an external font host.
 */
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  weight: ["500", "600", "700", "800"],
  variable: "--font-jakarta",
});

export const metadata: Metadata = {
  title: {
    default: "Bookit — Discover events. Book. Attend. Enjoy.",
    template: "%s · Bookit",
  },
  description:
    "From concerts and sports to meetings, weddings, ceremonies and community events — find it all on Bookit. Buy tickets, RSVP or make a reservation.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  openGraph: {
    title: "Bookit — Discover events. Book. Attend. Enjoy.",
    description:
      "Kenya's event platform for paid tickets, free RSVPs, private invitations, bookings and banquets.",
    type: "website",
    locale: "en_KE",
  },
};

/**
 * Every page reads live data — availability, guest counts, order state — so
 * nothing may be baked at build time. A ticket count frozen into static HTML is
 * a ticket count that oversells.
 */
export const dynamic = "force-dynamic";

export const viewport: Viewport = {
  themeColor: "#FFFDF9",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-KE" className={`${inter.variable} ${jakarta.variable}`}>
      <body className="flex min-h-screen flex-col">
        {/* First tab stop on every page. */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-xl focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground"
        >
          Skip to main content
        </a>
        <SiteHeader />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
