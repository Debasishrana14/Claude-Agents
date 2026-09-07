# Global Claude Code Working Agreement

These instructions apply to my Claude Code sessions across projects

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

@C:\Users\SSD\.claude\rules\orchestration.md

## Department boundaries

@C:\Users\SSD\.claude\rules\departments.md

## Verification

@C:\Users\SSD\.claude\rules\verification.md

## Complexity

@C:\Users\SSD\.claude\rules\complexity.md


context_window.used_percentage
context_window.remaining_percentage
context_window.total_input_tokens
context_window.total_output_tokens
context_window.context_window_size


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
                    progress.json
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

Never exceed 100,000 tokens per session [use variable here we will update it later]
