import type { Metadata, Viewport } from "next";
import { Anton, Cormorant_Garamond, Inter, Plus_Jakarta_Sans } from "next/font/google";
import Script from "next/script";
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

/**
 * Serif for private-event microsites. A ruracio or wedding invitation set in
 * the same UI sans as the checkout would read as a receipt, not an invitation.
 */
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  weight: ["500", "600", "700", "800"],
  variable: "--font-jakarta",
});

/**
 * Poster face for the USIKU voice — the condensed all-caps headlines on the
 * home hero and rails. One weight, used loud and sparingly.
 */
const anton = Anton({
  subsets: ["latin"],
  display: "swap",
  weight: "400",
  variable: "--font-anton",
});

/**
 * Restores an explicit theme choice before first paint so a dark-mode visitor
 * never sees a white flash. Runs inline, ahead of hydration; no stored choice
 * means no stamp, and the OS preference decides via CSS.
 */
const THEME_INIT = `try{var t=localStorage.getItem("bookit-theme");if(t==="dark"||t==="light")document.documentElement.dataset.theme=t}catch(e){}`;

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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFFDF9" },
    { media: "(prefers-color-scheme: dark)", color: "#0A0B14" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en-KE"
      className={`${inter.variable} ${jakarta.variable} ${cormorant.variable} ${anton.variable}`}
      suppressHydrationWarning
    >
      {/* The site chrome lives in `(site)/layout.tsx`. Private invitation
          microsites render outside that group with their own theming. */}
      <body className="flex min-h-screen flex-col">
        {/* beforeInteractive lands this in the document head of the initial
            HTML — a plain inline <script> in a streamed body never executes. */}
        <Script id="bookit-theme-init" strategy="beforeInteractive">
          {THEME_INIT}
        </Script>
        {children}
      </body>
    </html>
  );
}
