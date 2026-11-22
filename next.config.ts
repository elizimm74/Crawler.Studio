import type { NextConfig } from "next";

// Where the page may load things from (Content Security Policy). If someone ever managed to sneak
// a script tag into a page, the browser would refuse to run code from their server.
const supabase = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://txoimqedwfsuxoqiguop.supabase.co").replace(/\/$/, "");
const dev = process.env.NODE_ENV !== "production";
const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`, // Next.js needs inline scripts; dev mode also needs eval
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  `img-src 'self' data: blob: ${supabase}`, // screenshots come from Supabase Storage
  "media-src 'self' blob:", // the video test reads your video in the browser
  `connect-src 'self' ${supabase} ${supabase.replace("https://", "wss://")}${dev ? " ws://localhost:*" : ""}`,
  "worker-src 'self' blob:",
  "frame-ancestors 'none'",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  ...(dev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false, // don't advertise which framework runs the site
  // Playwright controls a real browser, so it must run as normal Node.js code
  // instead of being bundled like the rest of the app.
  serverExternalPackages: ["playwright"],
  // Security headers on every page.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" }, // nobody can put Crawler inside their site
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }, // always HTTPS
          { key: "Content-Security-Policy", value: CSP },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
