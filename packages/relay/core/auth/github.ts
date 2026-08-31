import type { AuthIdentity, AuthProvider } from "./types.ts";

/** The verified identity fields returned by GitHub. OAuth transport is client-specific. */
export interface GitHubProfile {
	id?: number | string | null;
	email?: string | null;
}

/** Converts a verified GitHub profile into the application identity format. */
export class GitHubAuthProvider implements AuthProvider<GitHubProfile> {
	authenticate(profile: GitHubProfile): Promise<AuthIdentity> {
		if (profile.id === undefined || profile.id === null) {
			throw new Error("A GitHub profile ID is required");
		}
		const subject = String(profile.id);
		return Promise.resolve({
			provider: "github",
			subject,
			...(profile.email ? { email: profile.email } : {}),
		});
	}
}
