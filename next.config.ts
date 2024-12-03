import type { NextConfig } from "next";

// ngrok free tunnels are now *.ngrok-free.dev (older ones were *.ngrok-free.app
// / *.ngrok.io); paid/custom domains use *.ngrok.app / *.ngrok.dev.
const tunnelOrigins = [
  "*.ngrok-free.dev",
  "*.ngrok-free.app",
  "*.ngrok.app",
  "*.ngrok.dev",
  "*.ngrok.io",
];

const nextConfig: NextConfig = {
  // Let the dev server serve assets + HMR to the tunnel origin.
  allowedDevOrigins: tunnelOrigins,
  experimental: {
    serverActions: {
      // Let Server Actions (login, etc.) be invoked through the tunnel.
      allowedOrigins: tunnelOrigins,
    },
  },
};

export default nextConfig;
