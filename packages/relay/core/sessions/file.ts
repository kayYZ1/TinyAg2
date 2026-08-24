import { SessionManager } from "./manager.ts";
import type { SessionHandle, SessionScope, SessionStore, SessionSummary } from "./types.ts";

/**
 * Storage contract adapter for the existing JSONL session implementation.
 *
 * This intentionally preserves the current filesystem behavior. It gives
 * database-backed stores the same frontend-facing shape without changing the
 * CLI migration and persistence semantics in the same step.
 */
export class FileSessionStore implements SessionStore {
	create(scope: SessionScope): SessionHandle {
		return SessionManager.create(scope.cwd, scope.ownerId);
	}

	async continueRecent(scope: SessionScope): Promise<SessionHandle | null> {
		return await SessionManager.continueRecent(scope.cwd, scope.ownerId);
	}

	async open(reference: string, _ownerId: string): Promise<SessionHandle> {
		return await SessionManager.open(reference);
	}

	async listSummaries(scope: SessionScope): Promise<SessionSummary[]> {
		return await SessionManager.listSummaries(scope.cwd, scope.ownerId);
	}
}
