
import { PrismaClient } from "@prisma/client";

const isTestEnvironment = process.env.NODE_ENV === "test";
const databaseUrl = isTestEnvironment
  ? process.env.TEST_DATABASE_URL
  : process.env.DATABASE_URL;

if (isTestEnvironment && !databaseUrl) {
  throw new Error(
    "TEST_DATABASE_URL must be configured when NODE_ENV=test"
  );
}

const prisma = new PrismaClient({
  ...(databaseUrl
    ? {
        datasources: {
          db: { url: databaseUrl },
        },
      }
    : {}),
  log:
    process.env.NODE_ENV === "development"
      ? ["warn", "error"]
      : ["error"],
});

export default prisma;
