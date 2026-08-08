"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import type { Map as LeafletMap, TileLayer } from "leaflet";
import { THEME_EVENT } from "@/components/layout/theme-toggle";

export interface MapMarker {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  subtitle?: string;
  href?: string;
}

/**
 * Leaflet canvas with Carto basemaps — light and dark variants that follow
 * the site theme live, and the brand pin as a pure-CSS divIcon so no marker
 * sprite ever 404s out of the bundler.
 *
 * Leaflet touches `window` at import time, so the library loads inside the
 * effect, never at module scope where the server would evaluate it.
 */
export function MapCanvas({
  markers,
  className = "h-64",
  maxZoom = 15,
}: {
  markers: MapMarker[];
  className?: string;
  maxZoom?: number;
}) {
  const element = useRef<HTMLDivElement>(null);
  // Re-render the map only when the marker set genuinely changes.
  const markersKey = markers
    .map((marker) => `${marker.id}:${marker.latitude},${marker.longitude}`)
    .join("|");

  useEffect(() => {
    if (!element.current || markers.length === 0) return;

    let disposed = false;
    let map: LeafletMap | null = null;
    let tiles: TileLayer | null = null;
    let unbindTheme: (() => void) | null = null;

    const dark = () =>
      document.documentElement.dataset.theme === "dark" ||
      (document.documentElement.dataset.theme !== "light" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    const tileUrl = () =>
      dark()
        ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

    void (async () => {
      const L = (await import("leaflet")).default;
      if (disposed || !element.current) return;

      map = L.map(element.current, {
        scrollWheelZoom: false,
        attributionControl: true,
      });
      tiles = L.tileLayer(tileUrl(), {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      }).addTo(map);

      const icon = L.divIcon({
        className: "bookit-map-pin-wrap",
        html: '<span class="bookit-map-pin" aria-hidden="true"></span>',
        iconSize: [22, 22],
        iconAnchor: [11, 11],
        popupAnchor: [0, -14],
      });

      const escape = (text: string) =>
        text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

      const bounds: Array<[number, number]> = [];
      for (const marker of markers) {
        const position: [number, number] = [marker.latitude, marker.longitude];
        bounds.push(position);
        const title = marker.href
          ? `<a href="${escape(marker.href)}">${escape(marker.title)}</a>`
          : escape(marker.title);
        const subtitle = marker.subtitle
          ? `<span class="bookit-map-popup-sub">${escape(marker.subtitle)}</span>`
          : "";
        L.marker(position, { icon, alt: marker.title })
          .addTo(map)
          .bindPopup(`<span class="bookit-map-popup-title">${title}</span>${subtitle}`, {
            closeButton: false,
          });
      }

      if (bounds.length === 1) {
        map.setView(bounds[0]!, maxZoom);
      } else {
        map.fitBounds(bounds, { padding: [32, 32], maxZoom });
      }

      const onThemeChange = () => tiles?.setUrl(tileUrl());
      const media = window.matchMedia("(prefers-color-scheme: dark)");
      window.addEventListener(THEME_EVENT, onThemeChange);
      media.addEventListener("change", onThemeChange);
      unbindTheme = () => {
        window.removeEventListener(THEME_EVENT, onThemeChange);
        media.removeEventListener("change", onThemeChange);
      };
    })();

    return () => {
      disposed = true;
      unbindTheme?.();
      map?.remove();
    };
    // markersKey is the stable identity of `markers`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markersKey, maxZoom]);

  if (markers.length === 0) return null;

  return (
    <div
      ref={element}
      className={`w-full ${className}`}
      role="region"
      aria-label="Map of venue locations"
    />
  );
}
