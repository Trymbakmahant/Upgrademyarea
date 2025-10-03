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
    if (!apiKey || apiKey === "your_google_maps_api_key_here") {
      console.warn(
        "Google Maps API key not found. Please add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to your environment variables."
      );
      // Show a message in the map container
      if (mapRef.current) {
        mapRef.current.innerHTML = `
          <div class="flex items-center justify-center h-full bg-gray-100 rounded-lg">
            <div class="text-center text-gray-500 p-4">
              <svg class="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <p class="text-sm font-medium">Google Maps API Key Required</p>
              <p class="text-xs mt-1">Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to .env</p>
              <p class="text-xs mt-1">Lat: ${latitude.toFixed(
                4
              )}, Lng: ${longitude.toFixed(4)}</p>
            </div>
          </div>
        `;
      }
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
        className="w-full h-full rounded-lg border border-gray-200 bg-gray-100 flex items-center justify-center"
      >
        <div className="text-center text-gray-500">
          <svg
            className="w-8 h-8 mx-auto mb-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <p className="text-sm">Loading map...</p>
          <p className="text-xs mt-1">
            Lat: {latitude.toFixed(4)}, Lng: {longitude.toFixed(4)}
          </p>
        </div>
      </div>
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
