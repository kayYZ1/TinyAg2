import type { ToolCall } from "@/api/types.ts";

// ---------------------------------------------------------------------------
// Session header — first line of every .jsonl file
// ---------------------------------------------------------------------------

export interface SessionHeader {
	type: "session";
	version: number;
	id: string;
	timestamp: string;
	cwd: string;
	tokens?: number;
	cost?: number;
}

// ---------------------------------------------------------------------------
// Entry types — every line after the header is one of these
// ---------------------------------------------------------------------------

export interface EntryBase {
	type: string;
	id: string;
	timestamp: string;
}

export interface MessageEntry extends EntryBase {
	type: "message";
	role: "user" | "assistant";
	content: string | null;
	toolCalls?: ToolCall[];
}

export interface ToolResultEntry extends EntryBase {
	type: "tool_result";
	toolCallId: string;
	toolName: string;
	content: string;
	isError?: boolean;
}

export type Entry = MessageEntry | ToolResultEntry;

/** Entry input before the store assigns its id and timestamp. */
export type NewEntry =
	| Omit<MessageEntry, "id" | "timestamp">
	| Omit<ToolResultEntry, "id" | "timestamp">;

// ---------------------------------------------------------------------------
// In-memory session
// ---------------------------------------------------------------------------

export interface Session {
	header: SessionHeader;
	entries: Entry[];
}

export interface SessionSummary {
	id: string;
	path: string;
	timestamp: string;
	firstUserMessage: string | null;
}

/** Storage-backed session handle shared by filesystem and database stores. */
export interface SessionHandle {
	append(entry: NewEntry): Promise<string>;
	getEntries(): Entry[];
	getHeader(): SessionHeader;
	getTokens(): number;
	setTokens(tokens: number): void;
	getCost(): number;
	setCost(cost: number): void;
	flush(): Promise<void>;
}

/** Minimal store contract required by frontends to manage sessions. */
export interface SessionStore {
	create(cwd: string): SessionHandle;
	continueRecent(cwd: string): Promise<SessionHandle | null>;
	open(reference: string): Promise<SessionHandle>;
	listSummaries(cwd: string): Promise<SessionSummary[]>;
}

export const CURRENT_VERSION = 1;
