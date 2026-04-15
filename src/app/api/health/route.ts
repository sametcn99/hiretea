import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getDeploymentGiteaMode } from "@/lib/env";
import { getGiteaRuntimeReadiness } from "@/lib/gitea/runtime-config";

export const runtime = "nodejs";

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;

    return NextResponse.json({
      ok: true,
      databaseReady: true,
      giteaMode: getDeploymentGiteaMode(),
      runtimeReadiness: await getGiteaRuntimeReadiness(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        databaseReady: false,
        giteaMode: getDeploymentGiteaMode(),
        error:
          error instanceof Error ? error.message : "Healthcheck request failed.",
      },
      { status: 503 },
    );
  }
}