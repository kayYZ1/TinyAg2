import type { AuthIdentity, AuthProvider } from "./types.ts";

/** The verified identity fields returned by GitHub. OAuth transport is client-specific. */
export interface GitHubProfile {
	id: number | string;
	email?: string | null;
}

/** Converts a verified GitHub profile into the application identity format. */
export class GitHubAuthProvider implements AuthProvider<GitHubProfile> {
	authenticate(profile: GitHubProfile): Promise<AuthIdentity> {
		const subject = String(profile.id);
		if (!subject) throw new Error("A GitHub profile ID is required");
		return Promise.resolve({
			provider: "github",
			subject,
			...(profile.email ? { email: profile.email } : {}),
		});
	}
}
