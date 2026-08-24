import { createClient } from "@tursodatabase/serverless/compat";
import type { AuthenticatedUser, AuthIdentity, UserStore } from "./types.ts";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
	 id TEXT PRIMARY KEY,
	 created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS auth_identities (
	 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	 provider TEXT NOT NULL,
	 provider_subject TEXT NOT NULL,
	 email TEXT,
	 created_at TEXT NOT NULL,
	 PRIMARY KEY (provider, provider_subject)
);
CREATE INDEX IF NOT EXISTS auth_identities_user_idx ON auth_identities (user_id);
`;

type QueryArgs = (string | null)[];
type Result = { rows: Record<string, unknown>[] };
type DatabaseClient = Pick<ReturnType<typeof createClient>, "execute" | "batch">;

export interface DatabaseUserStoreOptions {
	url: string;
	authToken: string;
	client?: DatabaseClient;
}

function newId(): string {
	return crypto.randomUUID();
}

function rowString(row: Record<string, unknown>, key: string): string {
	const value = row[key];
	if (typeof value !== "string") throw new Error(`Invalid auth row: ${key} is not a string`);
	return value;
}

/** Turso-backed mapping from provider identities to internal user IDs. */
export class DatabaseUserStore implements UserStore {
	private readonly client: DatabaseClient;
	private readonly schemaReady: Promise<void>;

	constructor(options: DatabaseUserStoreOptions) {
		this.client = options.client ?? createClient({ url: options.url, authToken: options.authToken });
		this.schemaReady = this.initialize();
	}

	static fromEnv(options: Omit<DatabaseUserStoreOptions, "url" | "authToken" | "client"> = {}): DatabaseUserStore {
		const url = Deno.env.get("TURSO_DB_URL");
		const authToken = Deno.env.get("TURSO_DB_TOKEN");
		if (!url || !authToken) throw new Error("TURSO_DB_URL and TURSO_DB_TOKEN are required");
		return new DatabaseUserStore({ url, authToken, ...options });
	}

	async resolve(identity: AuthIdentity): Promise<AuthenticatedUser> {
		await this.schemaReady;
		const existing = await this.execute({
			sql: "SELECT user_id FROM auth_identities WHERE provider = ? AND provider_subject = ?",
			args: [identity.provider, identity.subject],
		});
		if (existing.rows[0]) return { id: rowString(existing.rows[0], "user_id") };

		const userId = newId();
		const now = new Date().toISOString();
		try {
			const statements = [
				{ sql: "INSERT INTO users (id, created_at) VALUES (?, ?)", args: [userId, now] },
				{
					sql: `INSERT INTO auth_identities
						(user_id, provider, provider_subject, email, created_at) VALUES (?, ?, ?, ?, ?)`,
					args: [userId, identity.provider, identity.subject, identity.email ?? null, now],
				},
			] as { sql: string; args: QueryArgs }[];
			await this.client.batch(statements, "write");
			return { id: userId };
		} catch (error) {
			// Another client may have claimed the identity between our read and insert.
			const raced = await this.execute({
				sql: "SELECT user_id FROM auth_identities WHERE provider = ? AND provider_subject = ?",
				args: [identity.provider, identity.subject],
			});
			if (raced.rows[0]) return { id: rowString(raced.rows[0], "user_id") };
			throw error;
		}
	}

	private async initialize(): Promise<void> {
		for (const sql of SCHEMA.split(";").map((part) => part.trim()).filter(Boolean)) await this.client.execute(sql);
	}

	private async execute(statement: { sql: string; args?: QueryArgs }): Promise<Result> {
		await this.schemaReady;
		return await this.client.execute(statement) as unknown as Result;
	}
}
