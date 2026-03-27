"use client";

import { useEffect, useRef } from "react";
import { Complaint } from "@/lib/types";

type GoogleCircle = {
  setRadius: (radius: number) => void;
  setOptions: (opts: Record<string, unknown>) => void;
};

type GoogleLike = {
  maps: {
    Map: new (el: HTMLElement, options: Record<string, unknown>) => unknown;
    Marker: new (opts: Record<string, unknown>) => unknown;
    Circle: new (opts: Record<string, unknown>) => GoogleCircle;
  };
};

type LeafletMap = {
  setView: (center: [number, number], zoom: number) => LeafletMap;
};

type LeafletLayer = {
  addTo: (map: LeafletMap) => LeafletLayer;
  bindPopup: (html: string) => LeafletLayer;
};

type LeafletCircleLayer = LeafletLayer & {
  setStyle: (opts: Record<string, unknown>) => void;
  setRadius: (r: number) => void;
};

type LeafletHeat = {
  heatLayer: (points: [number, number, number][], options: Record<string, unknown>) => LeafletLayer;
};

type LeafletLike = LeafletHeat & {
  map: (id: string) => LeafletMap;
  tileLayer: (url: string, options: Record<string, unknown>) => LeafletLayer;
  circleMarker: (center: [number, number], options: Record<string, unknown>) => LeafletLayer;
  circle: (center: [number, number], options: Record<string, unknown>) => LeafletCircleLayer;
};

declare global {
  interface Window {
    google?: GoogleLike;
    L?: LeafletLike;
  }
}

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Unable to load ${src}`));
    document.head.appendChild(script);
  });
}

function loadCss(href: string) {
  return new Promise<void>((resolve) => {
    if (document.querySelector(`link[href='${href}']`)) {
      resolve();
      return;
    }
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.onload = () => resolve();
    document.head.appendChild(link);
  });
}

function colorByCategory(cat: Complaint["aiCategory"]) {
  return {
    ROAD: "#dc2626",
    WASTE: "#16a34a",
    DRAINAGE: "#0284c7",
    STREETLIGHT: "#d97706",
    ANIMALS: "#7c3aed",
    ILLEGAL_STALL: "#334155",
  }[cat];
}

function clusterCenters(complaints: Complaint[]) {
  const grouped = complaints.reduce<Record<string, { lat: number; lng: number; count: number }>>((acc, item) => {
    if (item.status === "DONE") return acc;
    const key = item.zone;
    if (!acc[key]) acc[key] = { lat: 0, lng: 0, count: 0 };
    acc[key].lat += item.lat;
    acc[key].lng += item.lng;
    acc[key].count += 1;
    return acc;
  }, {});

  return Object.values(grouped)
    .filter((v) => v.count >= 3)
    .map((v) => ({ lat: v.lat / v.count, lng: v.lng / v.count, count: v.count }));
}

type PredictiveHotspot = {
  zone: string;
  lat: number;
  lng: number;
  count: number;
  topCategory: string;
  predictedIncreasePct: number;
  riskLabel: string;
};

export function InsightsMap({
  complaints,
  predictiveHotspots = [],
}: {
  complaints: Complaint[];
  predictiveHotspots?: PredictiveHotspot[];
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML = "";
    let timerId: ReturnType<typeof setInterval> | undefined;

    const hotspots = clusterCenters(complaints);
    const googleKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (googleKey) {
      loadScript(`https://maps.googleapis.com/maps/api/js?key=${googleKey}`)
        .then(() => {
          const google = window.google;
          if (!google) return;
          const map = new google.maps.Map(el, {
            center: { lat: 4.2498, lng: 117.8871 },
            zoom: 11,
            mapTypeControl: false,
            streetViewControl: false,
          });

          complaints.forEach((item) => {
            const pos = { lat: item.lat, lng: item.lng };
            new google.maps.Marker({ map, position: pos, title: `${item.id} - ${item.aiCategory}` });
            new google.maps.Circle({
              map,
              center: pos,
              radius: item.aiUrgency === "HIGH" ? 340 : item.aiUrgency === "MEDIUM" ? 220 : 120,
              fillColor: colorByCategory(item.aiCategory),
              fillOpacity: 0.18,
              strokeOpacity: 0,
            });
          });

          const pulseCircles: GoogleCircle[] = hotspots.map((hot) =>
            new google.maps.Circle({
              map,
              center: { lat: hot.lat, lng: hot.lng },
              radius: 300,
              fillColor: "#FF4D4F",
              fillOpacity: 0.12,
              strokeColor: "#FF4D4F",
              strokeOpacity: 0.4,
              strokeWeight: 1,
            }),
          );

          predictiveHotspots.forEach((hot) => {
            new google.maps.Circle({
              map,
              center: { lat: hot.lat, lng: hot.lng },
              radius: 520,
              fillColor: "#8B5CF6",
              fillOpacity: 0.04,
              strokeColor: "#8B5CF6",
              strokeOpacity: 0.5,
              strokeWeight: 1,
            });
            new google.maps.Marker({
              map,
              position: { lat: hot.lat, lng: hot.lng },
              title: `Forecast: ${hot.zone} +${hot.predictedIncreasePct}%`,
            });
          });

          let phase = 0;
          timerId = setInterval(() => {
            phase = (phase + 1) % 40;
            pulseCircles.forEach((circle) => {
              const radius = 260 + phase * 10;
              circle.setRadius(radius);
              circle.setOptions({ fillOpacity: Math.max(0.02, 0.16 - phase * 0.0035) });
            });
          }, 90);
        })
        .catch(() => {
          el.innerHTML = "<div style='padding:12px;color:#991b1b;font-weight:600'>Google map failed to load.</div>";
        });
      return;
    }

    Promise.all([
      loadCss("https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"),
      loadScript("https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"),
      loadScript("https://unpkg.com/leaflet.heat/dist/leaflet-heat.js"),
    ])
      .then(() => {
        const L = window.L;
        if (!L) return;

        const id = "tawau-insight-map";
        el.id = id;

        const map = L.map(id).setView([4.2498, 117.8871], 11);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap contributors",
        }).addTo(map);

        const heatPoints: [number, number, number][] = complaints.map((item) => [
          item.lat,
          item.lng,
          item.aiUrgency === "HIGH" ? 0.9 : item.aiUrgency === "MEDIUM" ? 0.6 : 0.35,
        ]);

        L.heatLayer(heatPoints, { radius: 26, blur: 16, minOpacity: 0.3 }).addTo(map);

        complaints.forEach((item) => {
          L.circleMarker([item.lat, item.lng], {
            radius: 6,
            color: colorByCategory(item.aiCategory),
            fillColor: colorByCategory(item.aiCategory),
            fillOpacity: 0.95,
            weight: 1,
          }).addTo(map).bindPopup(`${item.id}<br/>${item.aiCategory}<br/>${item.zone}`);
        });

        const pulses: LeafletCircleLayer[] = hotspots.map((hot) =>
          L.circle([hot.lat, hot.lng], {
            radius: 260,
            color: "#FF4D4F",
            fillColor: "#FF4D4F",
            fillOpacity: 0.12,
            weight: 1,
          }).addTo(map) as LeafletCircleLayer,
        );

        predictiveHotspots.forEach((hot) => {
          L.circle([hot.lat, hot.lng], {
            radius: 520,
            color: "#8B5CF6",
            fillColor: "#8B5CF6",
            fillOpacity: 0.04,
            weight: 1,
          })
            .addTo(map)
            .bindPopup(`Forecast ${hot.zone}<br/>${hot.topCategory}<br/>+${hot.predictedIncreasePct}% next week`);
        });

        let phase = 0;
        timerId = setInterval(() => {
          phase = (phase + 1) % 36;
          pulses.forEach((layer) => {
            layer.setRadius(240 + phase * 11);
            layer.setStyle({ fillOpacity: Math.max(0.02, 0.16 - phase * 0.004) });
          });
        }, 90);
      })
      .catch(() => {
        el.innerHTML = "<div style='padding:12px;color:#991b1b;font-weight:600'>Leaflet map failed to load.</div>";
      });
    return () => {
      if (timerId) clearInterval(timerId);
    };
  }, [complaints, predictiveHotspots]);

  return <div ref={ref} className="h-[430px] w-full rounded-lg border border-slate-300 bg-slate-50" />;
}
