// Public workflow identifiers and migration aliases share one source of truth.
export const WORKFLOWS = Object.freeze([
  'plan-task', 'implement-feature', 'diagnose-issue', 'research-task',
  'review-code', 'verify-change', 'coordinate-tasks', 'resume-task',
  'write-commit', 'apply-conventions'
]);

export const WORKFLOW_ALIASES = Object.freeze({
  'dev-mode': 'implement-feature',
  'debug-mode': 'diagnose-issue',
  'research-dev-mode': 'research-task',
  'target-mode': 'implement-feature',
  'coordinate-work': 'coordinate-tasks',
  'review-change': 'review-code',
  'manual-qa': 'verify-change',
  'commit-message': 'write-commit',
  'legacy-naming': 'apply-conventions'
});

export function resolveWorkflow(name) {
  if (Object.hasOwn(WORKFLOW_ALIASES, name)) return WORKFLOW_ALIASES[name];
  return WORKFLOWS.includes(name) ? name : null;
}

export const HOOK_EVENTS = Object.freeze([
  'SessionStart', 'UserPromptSubmit', 'PreToolUse', 'PostToolUse',
  'PostToolUseFailure', 'SubagentStart', 'SubagentStop', 'PreCompact',
  'SessionEnd', 'Stop'
]);
export const TOOL_MATCHER = '^(Read|Edit|Write|NotebookEdit|Agent|Task)$';
