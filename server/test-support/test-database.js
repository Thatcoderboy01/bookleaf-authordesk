
import { PrismaClient } from "@prisma/client";

const url = process.env.TEST_DATABASE_URL;

if (!url) {
  throw new Error("TEST_DATABASE_URL must be configured before running tests");
}

const parsedUrl = new URL(url);

if (parsedUrl.pathname !== "/bookleaf_authordesk_test") {
  throw new Error(
    "Refusing to run tests: TEST_DATABASE_URL must target bookleaf_authordesk_test"
  );
}

const prisma = new PrismaClient({
  datasources: {
    db: { url },
  },
});

export default prisma;
