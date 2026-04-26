import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SQB OvozAI",
    short_name: "SQB OvozAI",
    description: "Sanoat Qurilish Bank voice assistant",
    start_url: "/",
    display: "standalone",
    background_color: "#02060a",
    theme_color: "#02060a",
    orientation: "portrait",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
