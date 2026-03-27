import type { NextConfig } from "next";

function buildContentSecurityPolicy(): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
  let apiOrigin = "";

  try {
    apiOrigin = new URL(apiUrl).origin;
  } catch {
    apiOrigin = "";
  }

  const connectSrc = ["'self'", "https:"];
  if (apiOrigin && !connectSrc.includes(apiOrigin)) {
    connectSrc.push(apiOrigin);
  }

  const imgSrc = ["'self'", "data:", "blob:", "https:"];
  if (apiOrigin && !imgSrc.includes(apiOrigin)) {
    imgSrc.push(apiOrigin);
  }

  return [
    "default-src 'self'",
    `img-src ${imgSrc.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "font-src 'self' data: https:",
    `connect-src ${connectSrc.join(" ")}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "geolocation=(), microphone=(), camera=()" },
          {
            key: "Content-Security-Policy",
            value: buildContentSecurityPolicy(),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
