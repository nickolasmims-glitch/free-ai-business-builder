import { autopilot, checkoutStatus, createCheckout, health, analyticsEvent, marketIntel, paymentHistory, businessMetrics, squareConfig, squarePayment, stripeWebhook, systemStatus } from "../server/api-handlers.js";

const routes = {
  "/api/autopilot": autopilot,
  "/api/checkout-status": checkoutStatus,
  "/api/create-checkout": createCheckout,
  "/api/health": health,
  "/api/analytics-event": analyticsEvent,
  "/api/market-intel": marketIntel,
  "/api/payment-history": paymentHistory,
  "/api/business-metrics": businessMetrics,
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
