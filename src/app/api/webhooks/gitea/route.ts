import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { env, hasWebhookConfiguration } from "@/lib/env";
import {
  processGiteaWebhookDelivery,
  recordFailedGiteaWebhookDelivery,
} from "@/lib/gitea/webhooks";

export const runtime = "nodejs";

function isValidSignature(payload: string, signature: string | null) {
  if (!env.GITEA_WEBHOOK_SECRET || !signature) {
    return false;
  }

  const digest = createHmac("sha256", env.GITEA_WEBHOOK_SECRET)
    .update(payload)
    .digest("hex");
  const digestBuffer = Buffer.from(digest);
  const signatureBuffer = Buffer.from(signature);

  if (digestBuffer.length !== signatureBuffer.length) {
    return false;
  }

  return timingSafeEqual(digestBuffer, signatureBuffer);
}

export async function POST(request: Request) {
  if (!hasWebhookConfiguration()) {
    return NextResponse.json(
      { error: "Webhook runtime configuration is incomplete." },
      { status: 503 },
    );
  }

  const rawBody = await request.text();
  const eventName = request.headers.get("x-gitea-event") ?? "unknown";
  const deliveryId = request.headers.get("x-gitea-delivery");
  const signature = request.headers.get("x-gitea-signature");

  if (!signature || !isValidSignature(rawBody, signature)) {
    return NextResponse.json(
      { error: "Invalid webhook signature." },
      { status: 401 },
    );
  }

  let payload: unknown;

  try {
    payload = JSON.parse(rawBody) as unknown;
  } catch {
    return NextResponse.json(
      { error: "Webhook payload is not valid JSON." },
      { status: 400 },
    );
  }

  try {
    const result = await processGiteaWebhookDelivery({
      deliveryId,
      eventName,
      payload,
    });

    return NextResponse.json({
      ok: true,
      eventName,
      candidateCaseId: result.candidateCaseId,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Webhook delivery processing failed.";

    await recordFailedGiteaWebhookDelivery({
      deliveryId,
      eventName,
      payload,
      errorMessage,
      statusCode: 500,
    });

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 },
    );
  }
}
