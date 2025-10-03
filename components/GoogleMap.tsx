"use client";

import { useEffect, useRef } from "react";

interface GoogleMapProps {
  latitude: number;
  longitude: number;
  className?: string;
  zoom?: number;
}

export default function GoogleMap({
  latitude,
  longitude,
  className = "w-full h-48 rounded-lg",
  zoom = 15,
}: GoogleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    // Check if API key is available
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.warn(
        "Google Maps API key not found. Please add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to your environment variables."
      );
      return;
    }

    // Load Google Maps API
    const loadGoogleMaps = () => {
      if (window.google && window.google.maps) {
        initializeMap();
        return;
      }

      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = initializeMap;
      script.onerror = () => {
        console.error("Failed to load Google Maps API");
      };
      document.head.appendChild(script);
    };

    const initializeMap = () => {
      if (!mapRef.current || !window.google) return;

      const map = new window.google.maps.Map(mapRef.current, {
        center: { lat: latitude, lng: longitude },
        zoom: zoom,
        mapTypeId: window.google.maps.MapTypeId.ROADMAP,
        styles: [
          {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "off" }],
          },
        ],
        disableDefaultUI: false,
        zoomControl: true,
        streetViewControl: false,
        fullscreenControl: true,
      });

      // Add marker
      new window.google.maps.Marker({
        position: { lat: latitude, lng: longitude },
        map: map,
        title: "Report Location",
        icon: {
          url:
            "data:image/svg+xml;charset=UTF-8," +
            encodeURIComponent(`
            <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
              <circle cx="16" cy="16" r="12" fill="#ef4444" stroke="#ffffff" stroke-width="2"/>
              <circle cx="16" cy="16" r="6" fill="#ffffff"/>
            </svg>
          `),
          scaledSize: new window.google.maps.Size(32, 32),
        },
      });
    };

    loadGoogleMaps();

    return () => {
      // Cleanup
      const scripts = document.querySelectorAll(
        'script[src*="maps.googleapis.com"]'
      );
      scripts.forEach((script) => script.remove());
    };
  }, [latitude, longitude, zoom]);

  return (
    <div className={className}>
      <div
        ref={mapRef}
        className="w-full h-full rounded-lg border border-gray-200"
      />
    </div>
  );
}

// Google Maps types
interface GoogleMapOptions {
  center: { lat: number; lng: number };
  zoom: number;
  mapTypeId: string;
  styles?: Array<{
    featureType: string;
    elementType: string;
    stylers: Array<{ visibility: string }>;
  }>;
  disableDefaultUI: boolean;
  zoomControl: boolean;
  streetViewControl: boolean;
  fullscreenControl: boolean;
}

interface GoogleMarkerOptions {
  position: { lat: number; lng: number };
  map: unknown;
  title: string;
  icon?: {
    url: string;
    scaledSize: unknown;
  };
}

interface GoogleSize {
  new (width: number, height: number): unknown;
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    google: {
      maps: {
        Map: new (element: HTMLElement, options: GoogleMapOptions) => unknown;
        MapTypeId: {
          ROADMAP: string;
        };
        Marker: new (options: GoogleMarkerOptions) => unknown;
        Size: GoogleSize;
      };
    };
  }
}
