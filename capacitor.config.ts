import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "uk.org.weybridgelodge.portal",
  appName: "Weybridge Lodge Portal",
  webDir: "dist",
  server: {
    url: "https://af7769c0-3910-4ce1-9c23-387cf7643cdb.lovableproject.com?forceHideBadge=true",
    cleartext: true,
  },
};

export default config;
