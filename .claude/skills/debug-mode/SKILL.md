---
name: debug-mode
description: Explicit debugging mode for evidence-driven root-cause analysis. Activate only when the user invokes /debug-mode; diagnosis is the outcome unless implementation is separately requested.
disable-model-invocation: true
---

# Debug Mode

Restate the symptom and define what evidence would establish a root cause. Use
the narrowest effective combination of reproduction, tracing, comparison,
hypothesis elimination, history, boundary analysis, lifecycle analysis, or
temporary instrumentation.

Work directly by default. If a separate debugger or research worker would
materially isolate noisy investigation, propose it and wait for approval.

Stop at an evidence-backed root cause. Report affected scope, rejected
hypotheses, fix constraints, confidence, and unknowns. Do not implement unless
the user also asks for a fix.
