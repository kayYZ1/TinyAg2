import type { Signal } from "@preact/signals-core";
import type { CursorStyle } from "../types/index.ts";
import { inputManager, type KeyEvent } from "../../core/input.ts";
import { getHookKey, hasCleanup, setCleanup } from "./signals.ts";
import { deleteBackward, deleteForward, insertChar, moveCursor, setCursor, type TextState } from "./text-utils.ts";

export type VimMode = "NORMAL" | "INSERT";

interface UseTextInputOptions {
	value: Signal<string>;
	cursorPosition: Signal<number>;
	focused?: boolean;
	onChange?: (value: string) => void;
	onSubmit?: (value: string) => void;
	/** If provided, enables vim mode with NORMAL/INSERT states */
	mode?: Signal<VimMode>;
	onModeChange?: (mode: VimMode) => void;
}

function handleInsertMode(event: KeyEvent, state: TextState, options: UseTextInputOptions): boolean {
	if (options.mode && event.key === "escape") {
		options.mode.value = "NORMAL";
		options.onModeChange?.("NORMAL");
		moveCursor(state, -1);
		return true;
	}

	if (event.key === "enter") {
		options.onSubmit?.(state.value.value);
		return true;
	}

	if (event.key === "backspace") {
		const newValue = deleteBackward(state);
		if (newValue !== null) options.onChange?.(newValue);
		return true;
	}

	if (event.key === "delete" || (event.ctrl && event.key === "d")) {
		const newValue = deleteForward(state);
		if (newValue !== null) options.onChange?.(newValue);
		return true;
	}

	if (event.key.length === 1 && !event.ctrl && !event.meta) {
		const newValue = insertChar(state, event.key);
		options.onChange?.(newValue);
		return true;
	}

	return false;
}

function handleNormalMode(event: KeyEvent, state: TextState, options: UseTextInputOptions): boolean {
	const mode = options.mode!;
	const value = state.value.value;
	const cursor = state.cursorPosition.value;

	const enterInsert = (cursorDelta = 0) => {
		mode.value = "INSERT";
		options.onModeChange?.("INSERT");
		if (cursorDelta) {
			moveCursor(state, cursorDelta);
		}
	};

	switch (event.key) {
		case "i":
			enterInsert();
			return true;
		case "a":
			enterInsert(cursor < value.length ? 1 : 0);
			return true;
		case "A":
			mode.value = "INSERT";
			options.onModeChange?.("INSERT");
			setCursor(state, value.length);
			return true;
		case "I":
			mode.value = "INSERT";
			options.onModeChange?.("INSERT");
			setCursor(state, 0);
			return true;
		case "h":
			moveCursor(state, -1);
			return true;
		case "l":
			if (cursor < value.length - 1) moveCursor(state, 1);
			return true;
		case "0":
			setCursor(state, 0);
			return true;
		case "$":
			setCursor(state, Math.max(0, value.length - 1));
			return true;
		case "w": {
			const rest = value.slice(cursor);
			const match = rest.match(/^\s*\S*\s*/);
			if (match?.[0]) {
				setCursor(state, Math.min(cursor + match[0].length, value.length - 1));
			}
			return true;
		}
		case "b": {
			const before = value.slice(0, cursor);
			const match = before.match(/\S+\s*$/);
			setCursor(state, match ? cursor - match[0].length : 0);
			return true;
		}
		case "x": {
			const newValue = deleteForward(state);
			if (newValue !== null) {
				options.onChange?.(newValue);
				if (cursor >= newValue.length && cursor > 0) {
					moveCursor(state, -1);
				}
			}
			return true;
		}
		default:
			return false;
	}
}

export function useTextInput(options: UseTextInputOptions) {
	const key = getHookKey("input-");

	if (!hasCleanup(key) && options.focused !== false) {
		const state: TextState = { value: options.value, cursorPosition: options.cursorPosition };

		const cleanup = inputManager.onKey((event: KeyEvent) => {
			if (options.focused === false) return false;

			if (options.mode?.value === "NORMAL") {
				return handleNormalMode(event, state, options);
			}
			return handleInsertMode(event, state, options);
		});

		setCleanup(key, cleanup);
	}

	const cursorStyle: CursorStyle = options.mode?.value === "NORMAL" ? "block" : "bar";

	return {
		value: options.value,
		cursorPosition: options.cursorPosition,
		mode: options.mode,
		cursorStyle,
	};
}
