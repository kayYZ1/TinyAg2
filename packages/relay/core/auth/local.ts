import type { AuthIdentity, AuthProvider } from "./types.ts";

/** Development-only provider backed by a stable local subject. */
export class LocalAuthProvider implements AuthProvider {
	constructor(private readonly subject: string) {
		if (!subject) throw new Error("A local auth subject is required");
	}

	static fromEnv(): LocalAuthProvider {
		const subject = Deno.env.get("DEV_AUTH_SUBJECT");
		if (!subject) throw new Error("DEV_AUTH_SUBJECT is required when using local auth");
		return new LocalAuthProvider(subject);
	}

	authenticate(): Promise<AuthIdentity> {
		return Promise.resolve({ provider: "local", subject: this.subject });
	}
}
