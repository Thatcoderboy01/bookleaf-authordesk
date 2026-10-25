import "dotenv/config";

const port = Number(process.env.PORT || 5000);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be a valid port number between 1 and 65535");
}

const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";

try {
  new URL(clientUrl);
} catch {
  throw new Error("CLIENT_URL must be a valid URL");
}

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port,
  clientUrl,
};