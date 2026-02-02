import process from "node:process";
import { signal } from "@preact/signals-core";

export interface KeyEvent {
	key: string;
	ctrl: boolean;
	meta: boolean;
	shift: boolean;
}

export type KeyHandler = (event: KeyEvent) => boolean | void;

class InputManager {
	private globalHandlers: Set<KeyHandler> = new Set();
	private handlers: Set<KeyHandler> = new Set();
	private isRawMode = false;

	start() {
		if (this.isRawMode) return;

		if (process.stdin.isTTY) {
			process.stdin.setRawMode(true);
		}
		process.stdin.resume();
		process.stdin.setEncoding("utf8");
		process.stdin.on("data", this.handleData);
		this.isRawMode = true;
	}

	stop() {
		if (!this.isRawMode) return;

		process.stdin.off("data", this.handleData);
		if (process.stdin.isTTY) {
			process.stdin.setRawMode(false);
		}
		this.isRawMode = false;
	}

	private handleData = (data: string) => {
		for (const char of data) {
			const event = this.parseKey(char);
			for (const handler of this.globalHandlers) {
				if (handler(event) === true) return;
			}
			for (const handler of this.handlers) {
				if (handler(event) === true) return;
			}
		}
	};

	private parseKey(char: string): KeyEvent {
		const code = char.charCodeAt(0);

		if (code === 3) {
			return { key: "c", ctrl: true, meta: false, shift: false };
		}
		if (code === 13) {
			return { key: "enter", ctrl: false, meta: false, shift: false };
		}
		if (code === 127 || code === 8) {
			return { key: "backspace", ctrl: false, meta: false, shift: false };
		}
		if (code === 27) {
			return { key: "escape", ctrl: false, meta: false, shift: false };
		}
		if (code === 9) {
			return { key: "tab", ctrl: false, meta: false, shift: false };
		}
		if (code >= 1 && code <= 26) {
			return {
				key: String.fromCharCode(code + 96),
				ctrl: true,
				meta: false,
				shift: false,
			};
		}

		return { key: char, ctrl: false, meta: false, shift: false };
	}

	onKeyGlobal(handler: KeyHandler): () => void {
		this.globalHandlers.add(handler);
		return () => this.globalHandlers.delete(handler);
	}

	onKey(handler: KeyHandler): () => void {
		this.handlers.add(handler);
		return () => this.handlers.delete(handler);
	}
}

export const inputManager = new InputManager();

export function useInput(handler: KeyHandler) {
	return inputManager.onKey(handler);
}

export const cursorPosition = signal<{ x: number; y: number } | null>(null);
