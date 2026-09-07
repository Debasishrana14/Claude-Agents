# Claude Code Working Agreement

These instructions apply when Claude Code is launched in this project.

## Core principles

1. Prefer direct execution for small or well-understood work.
2. Use subagents only when they reduce context, improve reasoning, isolate work, or enable genuinely independent work
3. Do not spawn agents merely because a task is large.
4. Preserve user intent and minimize unnecessary changes.
5. Never expand scope without justification.

## Task types

Treat these as distint workflows:

- Bug fix
- Refactor
- Code review
- Feature
- Research
- Experiment
- Performance investigation

Bug fixes, refactors, and code reviews should use the lightweight workflows defined in the orchestration rules.

## Shared orchestration rules

@.claude/rules/orchestration.md

## Department boundaries

@.claude/rules/departments.md

## Verification

@.claude/rules/verification.md

## Complexity

@.claude/rules/complexity.md

## Research and experimentation

Load these rules when the corresponding workflow is used:

- Research: @.claude/rules/research.md
- Experimentation: @.claude/rules/experimentation.md


                       USER
                         │
                         ▼
                 ┌───────────────┐
                 │  MAIN CLAUDE  │
                 │  Orchestrator │
                 └───────┬───────┘
                         │
              classify task
                         │
           ┌─────────────┼──────────────┐
           │             │              │
         Small         Medium          Big
           │             │              │
        Direct       Mostly direct   Orchestrate
                                         │
                     ┌───────────────────┼───────────────────┐
                     │                   │                   │
                 Research            Experiment          Planner
                  Haiku                Sonnet              Opus
                     │                   │                   │
                     └───────────────────┼───────────────────┘
                                         │
                                         ▼
                                   Implementer
                                     Sonnet
                                         │
                                         ▼
                                    Verifier
                                     Sonnet
                                         │
                                         ▼
                                    Reviewer
                                     Sonnet

---

                 ┌──────────────────────┐
                 │    Claude Hooks      │
                 └──────────┬───────────┘
                            │
            ┌───────────────┼───────────────┐
            ▼               ▼               ▼
       Agent Start      Agent Stop      Task Complete
            │               │               │
            └───────────────┼───────────────┘
                            ▼
       .claude/state/<session-id>.progress.json
                            │
                            ▼
                     statusline.mjs
                            │
                            ▼
                       LIVE STATUS

---

Understand
    │
    ▼
Enough information?
   /       \
 yes        no
 │           │
 ▼           ▼
Locate     Research
             │
             ▼
       Behavior uncertain?
          /       \
        no         yes
        │           │
        ▼           ▼
      Diagnose   Experiment
                    │
                    ▼
                 Diagnose
                    │
                    ▼
                Implement
                    │
                    ▼
                 Verify

Use `context_window.used_percentage` from the status line as advisory context
visibility. Do not impose a fixed token ceiling because available context varies
by model and session configuration.
