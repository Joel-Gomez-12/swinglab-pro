/* Stripe webhook: the ONLY thing that may mark a payment as completed.
   On `checkout.session.completed` it records the buyer in Supabase.
   Configure this URL in the Stripe dashboard and set STRIPE_WEBHOOK_SECRET. */
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

type NetlifyEvent = { httpMethod: string; body: string | null; isBase64Encoded?: boolean; headers: Record<string, string> };
type NetlifyResponse = { statusCode: number; body: string };

export const handler = async (event: NetlifyEvent): Promise<NetlifyResponse> => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "method_not_allowed" };

  const secret = process.env.STRIPE_SECRET_KEY;
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !whSecret) return { statusCode: 500, body: "stripe_not_configured" };

  const stripe = new Stripe(secret);
  const sig = event.headers["stripe-signature"] || event.headers["Stripe-Signature"];
  const raw = event.isBase64Encoded && event.body
    ? Buffer.from(event.body, "base64").toString("utf8")
    : event.body || "";

  let stripeEvent: Stripe.Event;
  try {
    stripeEvent = stripe.webhooks.constructEvent(raw, sig || "", whSecret);
  } catch (e) {
    return { statusCode: 400, body: "invalid_signature:" + String((e as Error).message).slice(0, 120) };
  }

  if (stripeEvent.type === "checkout.session.completed") {
    const session = stripeEvent.data.object as Stripe.Checkout.Session;
    const supaUrl = process.env.SUPABASE_URL;
    const supaKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (supaUrl && supaKey) {
      const supabase = createClient(supaUrl, supaKey);
      const { error } = await supabase.from("founders").upsert(
        {
          stripe_session_id: session.id,
          stripe_customer_id: (session.customer as string) || null,
          email: session.customer_details?.email || session.customer_email || null,
          amount_total: session.amount_total,
          currency: session.currency,
          lang: session.metadata?.lang || null,
          paid: session.payment_status === "paid",
          created_at: new Date().toISOString(),
        },
        { onConflict: "stripe_session_id" }
      );
      if (error) return { statusCode: 500, body: "supabase_error:" + error.message.slice(0, 120) };
    }
  }

  return { statusCode: 200, body: "ok" };
};
