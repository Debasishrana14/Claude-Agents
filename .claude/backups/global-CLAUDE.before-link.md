# Working agreement

## 1. Sizing gate — ask before starting

Before doing any non-trivial work, first classify the request:

- **Small** — a single file or a couple of obvious edits, a lookup, a question,
  a bug with a known cause. Just do it. Do NOT ask anything.
- **Big** — touches multiple files/modules, changes behaviour users see,
  needs design decisions, refactors, or the cause is unknown.

For **Big** requests, stop and ask me ONE combined question (use AskUserQuestion)
covering:

1. **Plan first?** — plan mode + written plan for approval, or go straight to
   implementing.
2. **Subagents?** — do the work in this session, or fan it out to subagents.
3. **If subagents: which split, and which model per agent** — propose a concrete
   roster and let me edit it. Example shape:
   - `explore` — find where X lives — Haiku
   - `plan` — design the change — Opus
   - `implement` — write the code — Sonnet/Opus
   - `review` — check the diff — Sonnet

Propose a recommendation as the first option; don't just list choices neutrally.
Never spawn subagents or enter plan mode for a Big task without this gate.

If I say "just do it", "no plan", or "no agents" — skip the gate for that request.

## 2. Subagent rules

- One clear deliverable per agent; tell it what to return, not how to phrase it.
- Give each agent only the context it needs (file paths, symbols) — not a dump.
- Match model to job: search/summarise → Haiku; design/tricky reasoning → Opus;
  routine implementation → Sonnet.
- Run independent agents in a single message so they go in parallel.
- Relay what matters from an agent's report; its output isn't shown to me.

## 3. Relay mode — the default shape for Big work

When subagents are used, default to a **relay**: a chain of agents where I (the
manager) route small handoffs between them. Parallel fan-out only when the
angles are genuinely independent.

The rules — all four, or the relay costs more than doing it in one session:

1. **Nothing large crosses an agent boundary.** Every handoff is a file path or
   a small structured value. An agent writes `scratchpad/findings.json` and
   returns *"wrote findings.json — 3 call sites in pricing/"*. The next agent is
   told to read it. The manager never holds the content.
2. **Specify the return type up front.** `Return JSON: [{file, line, symbol, why}]`
   — never "tell me what you found."
3. **Cap manager intake at ~300 tokens per handoff.** Bigger than that, it goes
   in a file. The manager routes; it does not carry.
4. **Cheap model for cheap work.** Search / grep sweeps / file inventory /
   "does X exist" → Haiku. Design and tricky reasoning → Opus. Routine
   implementation → Sonnet.

## 4. When NOT to use subagents

Delegation is not free — a fresh agent pays full price for its system prompt and
tool schemas, while a long main session gets those at a cache discount. Only
delegate work whose context is large, noisy, and throwaway.

| Shape | Do |
|---|---|
| Big read → small answer ("where is X handled") | Subagent |
| Long multi-stage work, stages don't need each other's noise | Relay |
| Several independent angles on the same input | Parallel agents |
| Sequential edits to files already in context | **Main session** |
| Splitting one task N ways to "spread load" | **Main session** |

The last two rows matter as much as the first three.

## 5. Testing & Complexity analysis
After every task complettion always ask if needs testing and do we need complexity analysis or not. If user did yes then for both start implementing both and choose model based on the complexity of the work that you need to be smart
