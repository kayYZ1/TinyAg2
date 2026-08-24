import { VERSION } from "../packages/cli/version.ts";

const decoder = new TextDecoder();

async function getGitHash(): Promise<string> {
	try {
		const cmd = new Deno.Command("git", {
			args: ["rev-parse", "--short", "HEAD"],
			stdout: "piped",
			stderr: "null",
		});
		const { stdout } = await cmd.output();
		return decoder.decode(stdout).trim();
	} catch {
		return "unknown";
	}
}

async function run(args: string[]) {
	const cmd = new Deno.Command(args[0], { args: args.slice(1), stdout: "inherit", stderr: "inherit" });
	const { code } = await cmd.output();
	if (code !== 0) {
		console.error(`Command failed with exit code ${code}: ${args.join(" ")}`);
		Deno.exit(1);
	}
}

async function build() {
	const hash = await getGitHash();
	const fullVersion = `${VERSION}+${hash}`;
	const compileArgs = [
		"deno",
		"compile",
		"--unstable-raw-imports",
		"--allow-env",
		"--allow-read",
		"--allow-write",
		"--allow-run",
		"--allow-net",
		"--output",
		"dist/relay",
		"packages/cli/agent/index.ts",
	];

	try {
		await Deno.stat(".env");
		compileArgs.splice(2, 0, "--env-file=.env");
	} catch {
		// Release builds intentionally use runtime environment variables.
	}

	console.log(`Building relay v${fullVersion}`);

	await run(compileArgs);

	const stat = await Deno.stat("dist/relay");
	const sizeMB = (stat.size / (1024 * 1024)).toFixed(1);
	console.log(`\n✓ Built dist/relay (${sizeMB} MB)`);
	console.log(`  Version: ${fullVersion}`);
}

build();
