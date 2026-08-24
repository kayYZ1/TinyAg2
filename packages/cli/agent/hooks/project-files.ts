import type { CommandPaletteItem } from "@/tui/render/hooks/command-palette.ts";
import { useSignal } from "@/tui/render/hooks/signals.ts";
import { listProjectFiles } from "@vvtxn/relay/core/workspace.ts";

export function useProjectFiles(root: string = Deno.cwd()) {
	const files = useSignal<CommandPaletteItem[]>([]);
	const status = useSignal<"idle" | "indexing" | "ready" | "error">("idle");
	const generation = useSignal(0);

	const startIndexing = () => {
		if (status.value === "indexing" || status.value === "ready") return;
		status.value = "indexing";
		const currentGeneration = ++generation.value;

		(async () => {
			try {
				const paths = await listProjectFiles(root);
				if (currentGeneration !== generation.value) return;
				files.value = paths.map((p) => ({ id: p, title: p }));
				status.value = "ready";
			} catch {
				if (currentGeneration !== generation.value) return;
				status.value = "error";
			}
		})();
	};

	const cancelIndexing = () => {
		generation.value++;
		if (status.value === "indexing") status.value = "idle";
	};

	return { files, status, startIndexing, cancelIndexing };
}
