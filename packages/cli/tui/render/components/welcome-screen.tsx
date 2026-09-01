import { Box, Text } from "../components.tsx";
import { theme } from "@/tui/theme.ts";
import { config } from "@/agent/config.ts";

// Spaces use \u00A0 (non-breaking space) so wrapText doesn't collapse them
const LOGO_LINES = [
	"██████╗ ███████╗██╗      █████╗ ██╗   ██╗",
	"██╔══██╗██╔════╝██║     ██╔══██╗╚██╗ ██╔╝",
	"██████╔╝█████╗  ██║     ███████║ ╚████╔╝ ",
	"██╔══██╗██╔══╝  ██║     ██╔══██║  ╚██╔╝  ",
	"██║  ██║███████╗███████╗██║  ██║   ██║   ",
	"╚═╝  ╚═╝╚══════╝╚══════╝╚═╝  ╚═╝   ╚═╝   ",
].map((line) => line.replace(/ /g, "\u00A0"));

const LOGO_COLORS = [
	theme.brand,
	theme.heading1,
	theme.info,
	theme.accent,
	theme.success,
	theme.warning,
];

export interface WelcomeScreenProps {
	version: string;
	subtitle?: string;
	hints?: string;
	user?: string;
}

export function WelcomeScreen(
	{ version, subtitle = "Type a message to get started", hints, user }: WelcomeScreenProps,
) {
	return (
		<Box flex flexDirection="column" justifyContent="center" alignItems="center" gap={1}>
			<Box flexDirection="column">
				{LOGO_LINES.map((line, i) => <Text key={i} color={LOGO_COLORS[i]} bold>{line}</Text>)}
			</Box>
			<Box flexDirection="column" alignItems="center" gap={1}>
				<Text color={theme.textMuted}>v{version}</Text>
				<Text color={theme.textDim}>{config.model.split("/").pop()}</Text>
				{user && <Text color={theme.textDim}>signed in as {user}</Text>}
				<Text color={theme.textDim} italic>{subtitle}</Text>
				{hints && <Text color={theme.textDim} italic>{hints}</Text>}
			</Box>
		</Box>
	);
}
