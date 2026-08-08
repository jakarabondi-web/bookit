/**
 * Google Maps embed — the keyless `output=embed` iframe.
 *
 * This replaced a Leaflet + tile-CDN map that depended on a third-party tile
 * host some networks resolve slowly or not at all. The embed is the actual
 * Google map people already trust: familiar controls, fast worldwide CDN,
 * zero JavaScript shipped by us, no API key, and the iframe lazy-loads so it
 * costs nothing until scrolled near.
 *
 * A server component on purpose — it renders to plain HTML.
 */
export function MapEmbed({
  query,
  zoom = 15,
  title,
  className = "h-64",
}: {
  /** What to show: "lat,lng" pins the exact spot; a place name centres on it. */
  query: string;
  zoom?: number;
  title: string;
  className?: string;
}) {
  const src = `https://www.google.com/maps?q=${encodeURIComponent(query)}&z=${zoom}&hl=en&output=embed`;

  return (
    <iframe
      src={src}
      title={title}
      loading="lazy"
      allowFullScreen
      referrerPolicy="no-referrer-when-downgrade"
      className={`block w-full border-0 ${className}`}
    />
  );
}
