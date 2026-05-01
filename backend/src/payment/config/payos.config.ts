export interface PayOSConfig {
  clientId: string;
  apiKey: string;
  checksumKey: string;
  environment: "sandbox" | "production";
}

export const payOSConfig = (): PayOSConfig => ({
  clientId: process.env.PAYOS_CLIENT_ID || "",
  apiKey: process.env.PAYOS_API_KEY || "",
  checksumKey: process.env.PAYOS_CHECKSUM_KEY || "",
  environment: (process.env.NODE_ENV === "production"
    ? "production"
    : "sandbox") as "sandbox" | "production",
});

export const validatePayOSConfig = (config: Partial<PayOSConfig>): boolean => {
  return !!(config.clientId && config.apiKey && config.checksumKey);
};
