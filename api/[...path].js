import autopilot from "./autopilot.js";
import checkoutStatus from "./checkout-status.js";
import createCheckout from "./create-checkout.js";
import health from "./health.js";
import marketIntel from "./market-intel.js";
import paymentHistory from "./payment-history.js";
import squareConfig from "./square-config.js";
import squarePayment from "./square-payment.js";
import stripeWebhook from "./stripe-webhook.js";
import systemStatus from "./system-status.js";

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
