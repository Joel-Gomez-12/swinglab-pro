/* Creates a Stripe Checkout Session for the 50€ founder plan.
   Runs only on Netlify's servers — the Stripe secret key stays here. */
import Stripe from "stripe";

type NetlifyEvent = { httpMethod: string; body: string | null; headers: Record<string, string> };
type NetlifyResponse = { statusCode: number; body: string; headers?: Record<string, string> };

const json = (statusCode: number, obj: unknown): NetlifyResponse => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(obj),
});

export const handler = async (event: NetlifyEvent): Promise<NetlifyResponse> => {
  if (event.httpMethod !== "POST") return json(405, { error: "method_not_allowed" });

  const secret = process.env.STRIPE_SECRET_KEY;
  const price = process.env.STRIPE_PRICE_ID;
  const siteUrl = process.env.VITE_SITE_URL || process.env.URL || "http://localhost:5173";
  if (!secret || !price) return json(500, { error: "stripe_not_configured" });

  const stripe = new Stripe(secret);
  let lang = "es";
  try { lang = (JSON.parse(event.body || "{}").lang as string) || "es"; } catch { /* ignore */ }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price, quantity: 1 }],
      // Collect an email so the webhook can record who paid.
      customer_creation: "always",
      metadata: { product: "swinglab_founder", lang },
      success_url: `${siteUrl}/?paid=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/?canceled=1`,
    });
    return json(200, { url: session.url });
  } catch (e) {
    return json(500, { error: "stripe_error", detail: String((e as Error).message).slice(0, 200) });
  }
};
