/**
 * Default system prompt for coding agents, shared across clients (TUI, web).
 *
 * Frontends may pass their own prompt via `AgentConfig.systemPrompt`; this is
 * just the shared default. Requires `--unstable-raw-imports` at runtime.
 */
import SYSTEM_PROMPT from "./system-prompt.md" with { type: "text" };

export { SYSTEM_PROMPT };
