import type { CommandPaletteItem } from "@/tui/render/hooks/command-palette.ts";
import { useSignal } from "@/tui/render/hooks/signals.ts";
import { listProjectFiles } from "@vvtxn/relay/core/workspace.ts";

export function useProjectFiles(root: string = Deno.cwd()) {
	const files = useSignal<CommandPaletteItem[]>([]);
	const status = useSignal<"idle" | "indexing" | "ready" | "error">("idle");

	const startIndexing = () => {
		if (status.value === "indexing" || status.value === "ready") return;
		status.value = "indexing";

		(async () => {
			try {
				const paths = await listProjectFiles(root);
				files.value = paths.map((p) => ({ id: p, title: p }));
				status.value = "ready";
			} catch {
				status.value = "error";
			}
		})();
	};

	return { files, status, startIndexing };
}
