import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { DatabaseUserStore, type DatabaseUserStoreOptions } from "@/core/auth/db.ts";
import { GitHubAuthProvider } from "@/core/auth/github.ts";
import { LocalAuthProvider } from "@/core/auth/local.ts";
import { authenticate } from "@/core/auth/service.ts";
import type { AuthIdentity } from "@/core/auth/types.ts";

Deno.test("LocalAuthProvider returns a local identity", async () => {
	const provider = new LocalAuthProvider("dev-user");
	assertEquals(await provider.authenticate(), { provider: "local", subject: "dev-user" });
});

Deno.test("GitHubAuthProvider uses the stable GitHub profile ID", async () => {
	const provider = new GitHubAuthProvider();
	assertEquals(await provider.authenticate({ id: 12345, email: "dev@example.com" }), {
		provider: "github",
		subject: "12345",
		email: "dev@example.com",
	});
});

Deno.test("GitHubAuthProvider rejects a missing profile ID", () => {
	assertThrows(() => new GitHubAuthProvider().authenticate({}), Error, "profile ID");
});

Deno.test("authenticate resolves an identity through the user store", async () => {
	let received: AuthIdentity | undefined;
	const user = await authenticate(new LocalAuthProvider("dev-user"), undefined, {
		resolve(identity) {
			received = identity;
			return Promise.resolve({ id: "internal-user-id" });
		},
	});
	assertEquals(received, { provider: "local", subject: "dev-user" });
	assertEquals(user, { id: "internal-user-id", name: "dev-user", provider: "local" });
});

Deno.test("authenticate prefers the identity email as the display name", async () => {
	const user = await authenticate(new GitHubAuthProvider(), { id: 12345, email: "dev@example.com" }, {
		resolve: () => Promise.resolve({ id: "internal-user-id" }),
	});
	assertEquals(user.name, "dev@example.com");
});

Deno.test("LocalAuthProvider rejects an empty subject", () => {
	assertThrows(() => new LocalAuthProvider(""), Error, "local auth subject");
});

type Statement = { sql: string; args?: unknown[] };

class FakeUserClient {
	private readonly identities = new Map<string, string>();
	private nextBatchError: Error | undefined;
	private racedUserId: string | undefined;

	setBatchError(error: Error): void {
		this.nextBatchError = error;
	}

	setRacedUser(id: string): void {
		this.racedUserId = id;
	}

	execute(statement: string | Statement): Promise<{ rows: Record<string, unknown>[] }> {
		if (typeof statement !== "string" && statement.sql.startsWith("SELECT user_id")) {
			const key = `${statement.args?.[0]}:${statement.args?.[1]}`;
			const userId = this.identities.get(key) ?? this.racedUserId;
			return Promise.resolve({ rows: userId ? [{ user_id: userId }] : [] });
		}
		return Promise.resolve({ rows: [] });
	}

	batch(statements: Statement[]): Promise<void> {
		if (this.nextBatchError) {
			const error = this.nextBatchError;
			this.nextBatchError = undefined;
			return Promise.reject(error);
		}
		const identity = statements[1].args ?? [];
		this.identities.set(`${identity[1]}:${identity[2]}`, String(identity[0]));
		return Promise.resolve();
	}
}

function userStoreWithFake(client: FakeUserClient): DatabaseUserStore {
	const options: DatabaseUserStoreOptions = {
		url: "turso://example",
		authToken: "test-token",
		client: client as unknown as NonNullable<DatabaseUserStoreOptions["client"]>,
	};
	return new DatabaseUserStore(options);
}

Deno.test("DatabaseUserStore resolves existing identities and creates new users", async () => {
	const store = userStoreWithFake(new FakeUserClient());
	const identity = { provider: "local", subject: "dev-user" };

	const first = await store.resolve(identity);
	const second = await store.resolve(identity);

	assertEquals(second, first);
});

Deno.test("DatabaseUserStore recovers when another client wins the identity race", async () => {
	const client = new FakeUserClient();
	client.setBatchError(Object.assign(new Error("UNIQUE constraint failed"), { code: "SQLITE_CONSTRAINT_UNIQUE" }));
	client.setRacedUser("winner");
	const store = userStoreWithFake(client);

	assertEquals(await store.resolve({ provider: "github", subject: "123" }), { id: "winner" });
});

Deno.test("DatabaseUserStore propagates non-constraint batch failures", async () => {
	const client = new FakeUserClient();
	client.setBatchError(new Error("database unavailable"));
	const store = userStoreWithFake(client);

	await assertRejects(
		() => store.resolve({ provider: "local", subject: "dev-user" }),
		Error,
		"database unavailable",
	);
});
