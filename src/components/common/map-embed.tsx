/**
 * Venue maps — OpenStreetMap's official embed endpoint.
 *
 * Two earlier attempts failed for reasons worth recording, so nobody repeats
 * them:
 *
 * 1. Leaflet + a tile CDN. Needed client JS and depended on a third-party
 *    tile host resolving.
 * 2. `google.com/maps?output=embed`. That endpoint is undocumented and Google
 *    serves `X-Frame-Options: SAMEORIGIN` on it, so the browser refuses the
 *    frame no matter what our own CSP says. Google's *supported* embed is the
 *    Maps Embed API, which requires a billed API key — not something to
 *    introduce for a location map.
 *
 * `openstreetmap.org/export/embed.html` is the endpoint behind OSM's own
 * "Share → Embed" button: keyless, explicitly built to be framed, and it
 * sets no `X-Frame-Options`. It takes a `bbox` viewport and one optional
 * `marker`.
 *
 * A server component — it renders plain HTML and ships no JavaScript. The
 * "open in Google Maps" affordance stays a normal link, which is never
 * subject to framing rules.
 */

/** [minLon, minLat, maxLon, maxLat] — the viewport OSM will render. */
export type BoundingBox = [number, number, number, number];

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

/**
 * A box around one point. `spanDegrees` is the full width in degrees —
 * ~0.01 is a few streets, ~0.2 a city, ~8 a country.
 */
export function boxAround(point: GeoPoint, spanDegrees = 0.012): BoundingBox {
  const half = spanDegrees / 2;
  return [
    point.longitude - half,
    point.latitude - half,
    point.longitude + half,
    point.latitude + half,
  ];
}

/**
 * The smallest box containing every point, with breathing room so markers
 * never sit on the frame edge. Returns null for an empty list.
 */
export function boxContaining(points: GeoPoint[], minSpanDegrees = 0.05): BoundingBox | null {
  if (points.length === 0) return null;
  if (points.length === 1) return boxAround(points[0]!, Math.max(minSpanDegrees, 0.02));

  const lons = points.map((point) => point.longitude);
  const lats = points.map((point) => point.latitude);
  let [minLon, maxLon] = [Math.min(...lons), Math.max(...lons)];
  let [minLat, maxLat] = [Math.min(...lats), Math.max(...lats)];

  // Pad by 12% of each axis, and enforce a floor so a tight cluster of
  // venues doesn't zoom to rooftop level.
  const lonPad = Math.max((maxLon - minLon) * 0.12, minSpanDegrees / 2);
  const latPad = Math.max((maxLat - minLat) * 0.12, minSpanDegrees / 2);
  minLon -= lonPad;
  maxLon += lonPad;
  minLat -= latPad;
  maxLat += latPad;

  return [minLon, minLat, maxLon, maxLat];
}

export function MapEmbed({
  bbox,
  marker,
  title,
  className = "h-64",
}: {
  bbox: BoundingBox;
  /** OSM's embed supports a single marker; omit for an area-only view. */
  marker?: GeoPoint;
  title: string;
  className?: string;
}) {
  const params = new URLSearchParams({
    bbox: bbox.map((value) => value.toFixed(6)).join(","),
    layer: "mapnik",
  });
  if (marker) params.set("marker", `${marker.latitude},${marker.longitude}`);

  return (
    <iframe
      src={`https://www.openstreetmap.org/export/embed.html?${params.toString()}`}
      title={title}
      loading="lazy"
      // The surface tint keeps the frame on-theme while tiles are still
      // loading, instead of flashing the browser's default white.
      className={`block w-full border-0 bg-surface-secondary ${className}`}
    />
  );
}
