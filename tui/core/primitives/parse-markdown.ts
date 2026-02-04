/** Represents a parsed markdown segment with styling */
export interface MarkdownSegment {
	text: string;
	bold?: boolean;
	italic?: boolean;
	strikethrough?: boolean;
	code?: boolean;
	color?: string;
}

/** Represents a parsed markdown line */
export interface MarkdownLine {
	segments: MarkdownSegment[];
	type: "paragraph" | "heading1" | "heading2" | "heading3" | "code" | "blockquote" | "listItem" | "hr";
	indent?: number;
}

/** Parse inline markdown formatting (bold, italic, code, strikethrough) */
function parseInlineFormatting(text: string): MarkdownSegment[] {
	const segments: MarkdownSegment[] = [];
	const remaining = text;

	// Regex patterns for inline formatting
	const patterns = [
		{ regex: /\*\*\*(.+?)\*\*\*/g, bold: true, italic: true },
		{ regex: /\*\*(.+?)\*\*/g, bold: true },
		{ regex: /\*(.+?)\*/g, italic: true },
		{ regex: /__(.+?)__/g, bold: true },
		{ regex: /_(.+?)_/g, italic: true },
		{ regex: /~~(.+?)~~/g, strikethrough: true },
		{ regex: /`(.+?)`/g, code: true },
	];

	// Find all matches and their positions
	interface Match {
		start: number;
		end: number;
		text: string;
		bold?: boolean;
		italic?: boolean;
		strikethrough?: boolean;
		code?: boolean;
	}

	const matches: Match[] = [];

	for (const pattern of patterns) {
		let match;
		const regex = new RegExp(pattern.regex.source, "g");
		while ((match = regex.exec(text)) !== null) {
			// Check if this range overlaps with existing matches
			const overlaps = matches.some(
				(m) =>
					(match!.index >= m.start && match!.index < m.end) ||
					(match!.index + match![0].length > m.start && match!.index + match![0].length <= m.end),
			);
			if (!overlaps) {
				matches.push({
					start: match.index,
					end: match.index + match[0].length,
					text: match[1],
					bold: pattern.bold,
					italic: pattern.italic,
					strikethrough: pattern.strikethrough,
					code: pattern.code,
				});
			}
		}
	}

	// Sort by position
	matches.sort((a, b) => a.start - b.start);

	// Build segments
	let pos = 0;
	for (const match of matches) {
		if (match.start > pos) {
			segments.push({ text: remaining.slice(pos, match.start) });
		}
		segments.push({
			text: match.text,
			bold: match.bold,
			italic: match.italic,
			strikethrough: match.strikethrough,
			code: match.code,
			color: match.code ? "gray" : undefined,
		});
		pos = match.end;
	}

	if (pos < remaining.length) {
		segments.push({ text: remaining.slice(pos) });
	}

	return segments.length > 0 ? segments : [{ text }];
}

/** Parse markdown text into structured lines */
export function parseMarkdown(content: string): MarkdownLine[] {
	const lines = content.split("\n");
	const result: MarkdownLine[] = [];
	let inCodeBlock = false;

	for (const line of lines) {
		// Code block toggle
		if (line.trim().startsWith("```")) {
			inCodeBlock = !inCodeBlock;
			continue;
		}

		// Inside code block
		if (inCodeBlock) {
			result.push({
				type: "code",
				segments: [{ text: line, code: true, color: "gray" }],
			});
			continue;
		}

		const trimmed = line.trim();

		// Empty line
		if (!trimmed) {
			result.push({ type: "paragraph", segments: [{ text: "" }] });
			continue;
		}

		// Horizontal rule
		if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
			result.push({
				type: "hr",
				segments: [{ text: "─".repeat(40), color: "gray" }],
			});
			continue;
		}

		// Headings
		const h3Match = trimmed.match(/^###\s+(.+)$/);
		if (h3Match) {
			result.push({
				type: "heading3",
				segments: [{ text: h3Match[1], bold: true, color: "cyan" }],
			});
			continue;
		}

		const h2Match = trimmed.match(/^##\s+(.+)$/);
		if (h2Match) {
			result.push({
				type: "heading2",
				segments: [{ text: h2Match[1], bold: true, color: "blue" }],
			});
			continue;
		}

		const h1Match = trimmed.match(/^#\s+(.+)$/);
		if (h1Match) {
			result.push({
				type: "heading1",
				segments: [{ text: h1Match[1], bold: true, color: "magenta" }],
			});
			continue;
		}

		// Blockquote
		const quoteMatch = trimmed.match(/^>\s*(.*)$/);
		if (quoteMatch) {
			result.push({
				type: "blockquote",
				segments: [
					{ text: "│ ", color: "gray" },
					...parseInlineFormatting(quoteMatch[1]).map((s) => ({ ...s, italic: true })),
				],
			});
			continue;
		}

		// List items
		const listMatch = trimmed.match(/^[-*+]\s+(.+)$/);
		if (listMatch) {
			result.push({
				type: "listItem",
				segments: [{ text: "• ", color: "gray" }, ...parseInlineFormatting(listMatch[1])],
			});
			continue;
		}

		// Numbered list
		const numListMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
		if (numListMatch) {
			result.push({
				type: "listItem",
				segments: [{ text: `${numListMatch[1]}. `, color: "gray" }, ...parseInlineFormatting(numListMatch[2])],
				indent: 0,
			});
			continue;
		}

		// Regular paragraph with inline formatting
		result.push({
			type: "paragraph",
			segments: parseInlineFormatting(trimmed),
		});
	}

	return result;
}
