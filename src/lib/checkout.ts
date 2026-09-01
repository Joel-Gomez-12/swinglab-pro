/* Kicks off Stripe Checkout via the Netlify serverless function.
   The browser never sees the Stripe secret key. */
export async function startFounderCheckout(lang: string): Promise<void> {
  const res = await fetch("/.netlify/functions/create-checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lang }),
  });
  if (!res.ok) throw new Error("checkout_failed_" + res.status);
  const data = (await res.json()) as { url?: string };
  if (!data.url) throw new Error("no_checkout_url");
  window.location.href = data.url;
}
