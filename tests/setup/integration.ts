import { afterAll, beforeAll, beforeEach } from "vitest";
import { db } from "@/lib/db";
import { resetDatabase } from "../integration/helpers/database";
import { shouldRunIntegrationTests } from "../integration/helpers/runtime";

beforeAll(async () => {
  if (!shouldRunIntegrationTests) {
    return;
  }

  await db.$queryRaw`SELECT 1`;
});

beforeEach(async () => {
  if (!shouldRunIntegrationTests) {
    return;
  }

  await resetDatabase();
});

afterAll(async () => {
  if (!shouldRunIntegrationTests) {
    return;
  }

  await db.$disconnect();
});
