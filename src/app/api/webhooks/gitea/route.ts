import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import {
  getGiteaRuntimeReadiness,
  getResolvedGiteaWebhookConfig,
} from "@/lib/gitea/runtime-config";
import {
  isSupportedWebhookEvent,
  processGiteaWebhookDelivery,
  recordFailedGiteaWebhookDelivery,
} from "@/lib/gitea/webhooks";

export const runtime = "nodejs";

function isValidSignature(
  payload: string,
  signature: string | null,
  secret: string,
) {
  if (!signature) {
    return false;
  }

  const digest = createHmac("sha256", secret).update(payload).digest("hex");
  const digestBuffer = Buffer.from(digest);
  const signatureBuffer = Buffer.from(signature);

  if (digestBuffer.length !== signatureBuffer.length) {
    return false;
  }

  return timingSafeEqual(digestBuffer, signatureBuffer);
}

export async function POST(request: Request) {
  const readiness = await getGiteaRuntimeReadiness();

  if (!readiness.webhookReady) {
    return NextResponse.json(
      { error: "Webhook runtime configuration is incomplete." },
      { status: 503 },
    );
  }

  const { secret } = await getResolvedGiteaWebhookConfig();

  const rawBody = await request.text();
  const eventName = request.headers.get("x-gitea-event") ?? "unknown";
  const deliveryId = request.headers.get("x-gitea-delivery");
  const signature = request.headers.get("x-gitea-signature");

  if (!deliveryId) {
    return NextResponse.json(
      { error: "Webhook delivery ID is required." },
      { status: 400 },
    );
  }

  if (!isSupportedWebhookEvent(eventName)) {
    return NextResponse.json(
      { error: `Unsupported webhook event: ${eventName}.` },
      { status: 400 },
    );
  }

  if (!signature || !isValidSignature(rawBody, signature, secret)) {
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

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
