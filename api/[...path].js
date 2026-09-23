import autopilot from "../server/legacy-api/autopilot.js";
import checkoutStatus from "../server/legacy-api/checkout-status.js";
import createCheckout from "../server/legacy-api/create-checkout.js";
import health from "../server/legacy-api/health.js";
import marketIntel from "../server/legacy-api/market-intel.js";
import paymentHistory from "../server/legacy-api/payment-history.js";
import squareConfig from "../server/legacy-api/square-config.js";
import squarePayment from "../server/legacy-api/square-payment.js";
import stripeWebhook from "../server/legacy-api/stripe-webhook.js";
import systemStatus from "../server/legacy-api/system-status.js";

const routes = {
  "/api/autopilot": autopilot,
  "/api/checkout-status": checkoutStatus,
  "/api/create-checkout": createCheckout,
  "/api/health": health,
  "/api/market-intel": marketIntel,
  "/api/payment-history": paymentHistory,
  "/api/square-config": squareConfig,
  "/api/square-payment": squarePayment,
  "/api/stripe-webhook": stripeWebhook,
  "/api/system-status": systemStatus
};

export default async function handler(req, res) {
  const pathname = new URL(req.url || "/", "https://free-ai-business-builder.vercel.app").pathname;
  const target = routes[pathname];

  if (!target) {
    res.statusCode = 404;
    return res.end("API route not found");
  }

  return target(req, res);
}
