# Research Rules

## Purpose

Research exists to discover facts required to make a correct decision.

Research is NOT planning.
Research is NOT implementation.
Research is NOT code review.

The research agent answers:

> "What is actually true in the current codebase?"

---

# 1. When to Research

Research is conditional.

Do NOT research when the main session already has enough information.

Use research when:

- the relevant code location is unknown
- behavior is spread across multiple modules
- call chains are unclear
- dependencies are unclear
- multiple implementations may exist
- the bug crosses module boundaries
- historical behavior matters.
- tests or configuration need to be discovered
- the codebase is large enough that exploration would pollute the main context. 
- implementation requires facts that are not currently known

---

# 2. Do Not Research Simple Tasks

Do not create a research agent for:

- obvious one-file bugs
- known function behavior 
- simple rename 
- formatting 
- straightforward implementation
- known call sites
- code already visible in the current context

Prefer direct work.

---

# 3. Research Scope

Research should answer only the assigned question.

Example:

Good:

"Find where Mullion docking is calculated and identify all callers."

Bad: 

"Understand the entire geometry architecture."

The second creates unnecessary context and investigation.

---

Use: 

1. file discovery
2. symbol search
3. call-site search
4. dependency tracing
5. relevannt test discovery
6. configuration discovery
7. existing documentation

Stop when sufficient evidence exists.

Do not continue exploring simple because more files can be found.

---

# 5. Research Output

Return a compact result:

- Objective
- Relevant files
- Relevant symbols
- Current behavior
- Important dependency relationships
- Evidence
- Unknowns
- Conclusion

If findings are large, write:

scratchpad/findings.json

Do not return large file dumps to the parent agent.

---

# 6. Research Restrictions

Research is READ-ONLY.

Do not:

- edit production code
- refactor code 
- create speculative fixes
- modify tests
- modify configuration
- make architecture decisions

Temporary scratch artifacts are allowed only when explicitly required

---

# 7. Research Completion Rule

Research is complete when the parent agent has enough evidence to:

- diagnose the issue
- decide whether an experiment is needed
- create an implementation plan
- or conclude that further investigation is unnecessary

Do not optimize for maximum discovery. 

Optimize for sufficient evidence.
