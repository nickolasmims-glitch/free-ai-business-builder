export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ ok: false, error: "Method not allowed" });

  const aiGateway = Boolean(process.env.AI_GATEWAY_API_KEY);
  const stripe = Boolean(process.env.STRIPE_SECRET_KEY);
  const email = Boolean(process.env.RESEND_API_KEY && process.env.FROM_EMAIL && process.env.AUTOPILOT_REPORT_EMAIL);

  return res.status(200).json({
    ok: true,
    platform: "Vercel",
    runtime: "cloud",
    browserRequiredForAgents: false,
    ai2: {
      status: aiGateway ? "CONFIGURED" : "WAITING_FOR_AI_GATEWAY_KEY",
      model: process.env.AI_AGENT_MODEL || "openai/gpt-5.6-sol"
    },
    ai3: {
      status: aiGateway ? "CONFIGURED" : "WAITING_FOR_AI_GATEWAY_KEY",
      model: process.env.AI_AGENT_EXECUTION_MODEL || "openai/gpt-5.6-terra"
    },
    fallbackModel: "openai/gpt-5.6-luna",
    supervisor: {
      platform: "GitHub Actions",
      cadence: "every 15 minutes",
      authenticationConfigured: true,
      authentication: "GitHub Actions OIDC",
      endpoint: "/api/guardian"
    },
    integrations: {
      aiGateway,
      stripeVerification: stripe,
      emailReports: email
    },
    safeguards: {
      goalsOwnerLocked: true,
      autonomousSpending: false,
      financialActionsRequireOwnerApproval: true,
      fabricatedRevenueForbidden: true
    },
    checkedAt: new Date().toISOString()
  });
}
