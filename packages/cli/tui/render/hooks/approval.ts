import { inputManager, type KeyEvent } from "../../core/input.ts";
import { getHookKey, hasCleanup, setCleanup, useSignal } from "./signals.ts";

export type ApprovalDecision = "allow" | "always" | "deny";

export interface ApprovalRequest {
	/** Display name of the tool (e.g. "Run", "Write"). */
	toolName: string;
	/** Summarized arguments (e.g. the command or file path). */
	summary: string;
}

interface PendingApproval extends ApprovalRequest {
	resolve: (decision: ApprovalDecision) => void;
}

/**
 * State and key handling for a tool-approval prompt. While a request is
 * pending the prompt consumes all keyboard input:
 *
 * - `y` / Enter — allow this call
 * - `a` — allow and remember the tool for the rest of the session
 * - `n` / Esc — deny
 *
 * Register this hook before other global key handlers (e.g. cancel-on-Esc)
 * so Esc denies a pending prompt instead of aborting the run.
 */
export function useApprovalPrompt() {
	const pending = useSignal<PendingApproval | null>(null);

	const key = getHookKey();
	if (!hasCleanup(key)) {
		const cleanup = inputManager.onKeyGlobal((event: KeyEvent) => {
			const current = pending.value;
			if (!current) return false;

			if (event.key === "y" || event.key === "enter") {
				pending.value = null;
				current.resolve("allow");
			} else if (event.key === "a") {
				pending.value = null;
				current.resolve("always");
			} else if (event.key === "n" || event.key === "escape") {
				pending.value = null;
				current.resolve("deny");
			}
			return true;
		});
		setCleanup(key, cleanup);
	}

	/** Opens the prompt and resolves with the user's decision. */
	const ask = (request: ApprovalRequest): Promise<ApprovalDecision> => {
		return new Promise((resolve) => {
			pending.value = { ...request, resolve };
		});
	};

	/** Resolves any pending request as "deny" and closes the prompt (e.g. on abort). */
	const cancel = () => {
		const current = pending.value;
		if (!current) return;
		pending.value = null;
		current.resolve("deny");
	};

	return { pending, ask, cancel };
}
