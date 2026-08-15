import type { Metadata, Viewport } from "next";
import {
  Anton,
  Caveat,
  Cinzel,
  Cormorant_Garamond,
  Fraunces,
  Inter,
  Marcellus,
  Outfit,
  Playfair_Display,
  Plus_Jakarta_Sans,
  Amatic_SC,
  Archivo,
  Bebas_Neue,
  Bitter,
  Bodoni_Moda,
  Cardo,
  Cormorant_Upright,
  Dancing_Script,
  EB_Garamond,
  Gilda_Display,
  Great_Vibes,
  Italiana,
  Josefin_Sans,
  Libre_Baskerville,
  Lora,
  Oswald,
  Parisienne,
  Poiret_One,
  Prata,
  Rozha_One,
  Space_Grotesk,
  Spectral,
  Syne,
  Tenor_Sans,
} from "next/font/google";
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
 * Display faces a host can choose in the invitation design module.
 *
 * All are declared `preload: false`. next/font emits the `@font-face` rules for
 * every family here, but a browser only fetches a font file once rendered text
 * actually asks for it — so a visitor buying a concert ticket pays for none of
 * these, and a guest opening an invitation downloads exactly the one face that
 * family chose.
 */
const marcellus = Marcellus({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  weight: "400",
  variable: "--font-marcellus",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-playfair",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-fraunces",
});

const cinzel = Cinzel({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-cinzel",
});

const outfit = Outfit({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-outfit",
});

const caveat = Caveat({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-caveat",
});

const bodoni = Bodoni_Moda({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-bodoni",
});

const baskerville = Libre_Baskerville({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-baskerville",
});

const lora = Lora({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-lora",
});

const garamond = EB_Garamond({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-garamond",
});

const spectral = Spectral({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  weight: ["400", "500", "600", "700"],
  variable: "--font-spectral",
});

const bitter = Bitter({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-bitter",
});

const cormorantupright = Cormorant_Upright({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  weight: ["400", "500", "600", "700"],
  variable: "--font-cormorant-upright",
});

const italiana = Italiana({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  weight: "400",
  variable: "--font-italiana",
});

const gilda = Gilda_Display({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  weight: "400",
  variable: "--font-gilda",
});

const prata = Prata({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  weight: "400",
  variable: "--font-prata",
});

const poiret = Poiret_One({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  weight: "400",
  variable: "--font-poiret",
});

const josefin = Josefin_Sans({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-josefin",
});

const syne = Syne({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-syne",
});

const spacegrotesk = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-space-grotesk",
});

const archivo = Archivo({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-archivo",
});

const oswald = Oswald({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-oswald",
});

const bebas = Bebas_Neue({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  weight: "400",
  variable: "--font-bebas",
});

const greatvibes = Great_Vibes({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  weight: "400",
  variable: "--font-great-vibes",
});

const parisienne = Parisienne({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  weight: "400",
  variable: "--font-parisienne",
});

const dancing = Dancing_Script({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-dancing",
});

const amatic = Amatic_SC({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  weight: ["400", "700"],
  variable: "--font-amatic",
});

const cardo = Cardo({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  weight: ["400", "700"],
  variable: "--font-cardo",
});

const tenor = Tenor_Sans({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  weight: "400",
  variable: "--font-tenor",
});

const rozha = Rozha_One({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  weight: "400",
  variable: "--font-rozha",
});

const ceremonyFontVariables = [
  marcellus.variable,
  playfair.variable,
  fraunces.variable,
  cinzel.variable,
  outfit.variable,
  caveat.variable,
  bodoni.variable,
  baskerville.variable,
  lora.variable,
  garamond.variable,
  spectral.variable,
  bitter.variable,
  cormorantupright.variable,
  italiana.variable,
  gilda.variable,
  prata.variable,
  poiret.variable,
  josefin.variable,
  syne.variable,
  spacegrotesk.variable,
  archivo.variable,
  oswald.variable,
  bebas.variable,
  greatvibes.variable,
  parisienne.variable,
  dancing.variable,
  amatic.variable,
  cardo.variable,
  tenor.variable,
  rozha.variable,
].join(" ");

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
      className={`${inter.variable} ${jakarta.variable} ${cormorant.variable} ${anton.variable} ${ceremonyFontVariables}`}
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
