export const CORE_AGENTS = [
  { key: "ai2", name: "AI2", role: "Execution Engineer", description: "Turns approved plans into concrete engineering and operations tasks, verifies results, and reports evidence." },
  { key: "ai3", name: "AI3", role: "Research & Growth Engineer", description: "Researches opportunities, evaluates business growth tasks, and proposes new capabilities with visible evidence." }
];

export function ensureCoreAgents(state) {
  for (const spec of CORE_AGENTS) {
    if (!state.bots.some(b => b.key === spec.key && b.status === "active")) {
      state.bots.unshift({
        id: spec.key,
        key: spec.key,
        name: spec.name,
        role: spec.role,
        reason: "Core system agent",
        description: spec.description,
        status: "active",
        system: true,
        createdAt: new Date().toISOString(),
        createdBy: "system"
      });
    }
  }
}
