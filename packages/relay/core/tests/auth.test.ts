import { assertEquals, assertThrows } from "@std/assert";
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

Deno.test("authenticate resolves an identity through the user store", async () => {
	let received: AuthIdentity | undefined;
	const user = await authenticate(new LocalAuthProvider("dev-user"), undefined, {
		resolve(identity) {
			received = identity;
			return Promise.resolve({ id: "internal-user-id" });
		},
	});
	assertEquals(received, { provider: "local", subject: "dev-user" });
	assertEquals(user, { id: "internal-user-id" });
});

Deno.test("LocalAuthProvider rejects an empty subject", () => {
	assertThrows(() => new LocalAuthProvider(""), Error, "local auth subject");
});
