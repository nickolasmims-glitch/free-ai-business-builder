# Customer Gateway

Ground-up architecture for one customer-facing app.

- Customer Gateway: HTTP API + customer UI.
- AI2: server-side research/strategy worker.
- AI3: server-side operations/verification worker.
- LotteryCloud: transparent 1–10 research-signal engine for Pick 3, Powerball, and Mega Millions.
- Stripe webhook endpoint: signature-aware and evidence-driven; no fabricated payment state.

Workers execute on the server process and do not depend on a browser session. This implementation is original project code and is not copied from Vercel or Lovable.
