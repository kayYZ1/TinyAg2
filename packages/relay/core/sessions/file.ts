import { SessionManager } from "./manager.ts";
import type { SessionHandle, SessionStore, SessionSummary } from "./types.ts";

/**
 * Storage contract adapter for the existing JSONL session implementation.
 *
 * This intentionally preserves the current filesystem behavior. It gives
 * database-backed stores the same frontend-facing shape without changing the
 * CLI migration and persistence semantics in the same step.
 */
export class FileSessionStore implements SessionStore {
	create(cwd: string): SessionHandle {
		return SessionManager.create(cwd);
	}

	async continueRecent(cwd: string): Promise<SessionHandle | null> {
		return await SessionManager.continueRecent(cwd);
	}

	async open(reference: string): Promise<SessionHandle> {
		return await SessionManager.open(reference);
	}

	async listSummaries(cwd: string): Promise<SessionSummary[]> {
		return await SessionManager.listSummaries(cwd);
	}
}
