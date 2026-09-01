import type { AuthenticatedUser, AuthProvider, UserStore } from "./types.ts";

/** Shared authentication boundary used by every frontend. */
export async function authenticate<Input>(
	provider: AuthProvider<Input>,
	input: Input,
	users: UserStore,
): Promise<AuthenticatedUser> {
	const identity = await provider.authenticate(input);
	const user = await users.resolve(identity);
	return {
		...user,
		name: user.name ?? identity.email ?? identity.subject,
		provider: identity.provider,
	};
}
