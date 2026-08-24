try {
	await import("./app.tsx");
} catch (error) {
	console.error(error instanceof Error ? error.message : String(error));
	Deno.exit(1);
}
