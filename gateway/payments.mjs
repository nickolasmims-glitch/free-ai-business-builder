export function paymentStatus() {
  return {
    provider: "Stripe-ready",
    configured: Boolean(process.env.STRIPE_SECRET_KEY),
    live: Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_MODE === "live"),
    note: "No revenue is reported unless verified from the payment provider."
  };
}
