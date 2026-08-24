# Relay v0.8.0

A coding agent with a custom terminal UI framework, built with Deno and TypeScript.

Relay is a monorepo (Deno workspace) containing a terminal UI framework powered by a custom JSX runtime and Yoga flexbox
layout, an OpenAI-compatible LLM API layer with streaming support, and an agentic loop with built-in tools — all wired
together into an interactive coding assistant that runs entirely in your terminal.

> **Note — Project Transition**
>
> Relay is evolving from a local, terminal-only coding agent into a more advanced agent designed to run on both the
> terminal and the web, sharing the same sessions between clients. Conversations are now persisted in a shared Turso
> database instead of local JSONL files, keyed by a stable owner ID and workspace, so a session started in one client
> can be continued in the other.
>
> **No new release will be published for this work yet.** The latest GitHub Release (`v0.8.0`) predates all web
> extension related changes and still reflects the old local-only agent with filesystem session storage. To use the new
> shared-session behavior, build from source as described below.

## Features

- **Custom JSX-based TUI framework** — Flexbox layout via Yoga, double-buffered rendering, reactive signals, vim-mode
  text input
- **OpenAI-compatible API layer** — Works with any provider exposing `/v1/chat/completions` (OpenRouter, OpenAI, local
  models, etc.)
- **Streaming agent loop** — Async generator that yields events for real-time UI updates as the LLM thinks and uses
  tools
- **Built-in tools** — Bash, file read/write/edit, and grep for filesystem interaction
- **Shared session storage** — Conversations persist in a Turso database so terminal and web clients share the same
  session history
- **Inline diffs** — File write and edit operations display colored unified diffs with line numbers
- **Markdown rendering** — Inline markdown display in the terminal with syntax highlighting
- **Command palette** — Fuzzy-searchable command menu

## Install

> The published binary (`v0.8.0`) is the local-only agent from before the web extension changes. Session persistence in
> that binary uses local JSONL files, not the shared database. Until a new release is published, build from source to
> get the current behavior.

Download the latest Linux binary from [GitHub Releases](https://github.com/vvtxn/relay/releases/latest):

```bash
curl -L https://github.com/vvtxn/relay/releases/latest/download/relay -o relay
chmod +x relay
sudo mv relay /usr/local/bin/
```

Or build the current version from source (see [Development](#development)):

```bash
git clone https://github.com/vvtxn/relay.git
cd relay
deno task build        # outputs dist/relay
```

On first run, Relay will prompt you for an API key and save it to `~/.relay/auth.json`.

Model and provider settings are configured in `~/.relay/config.json`.

## Quick Start

### Prerequisites

- [Deno](https://deno.com/) v2+

### Setup

```bash
git clone https://github.com/vvtxn/relay.git
cd relay
```

Set your API key:

```bash
export LLM_API_KEY="your-api-key"
export TURSO_DB_URL="your-database-url"
export TURSO_DB_TOKEN="your-database-token"
export RELAY_OWNER_ID="your-user-id"
```

### Run

```bash
deno task agent
```

## Architecture

```
├── packages/
│   ├── relay/              # Core agent library (@vvtxn/relay)
│   │   ├── api/            # LLM provider types and CompletionsProvider
│   │   └── core/           # Agent loop, runner, tools, sessions, context, display
│   └── cli/                # CLI + TUI frontend (@vvtxn/cli)
│       ├── agent/          # App entry point, config, components, hooks
│       └── tui/            # Terminal UI framework (JSX runtime, Yoga layout)
├── scripts/                # Build and version bump scripts
├── dist/                   # Compiled binary output
└── deno.json               # Workspace configuration
```

### Package Dependency Graph

```
packages/relay  (leaf — no internal deps)
       ↑
packages/cli  (depends on packages/relay + npm:@preact/signals-core + npm:yoga-layout)
```

### `packages/relay/api/` — LLM Provider Layer

Provides an OpenAI-compatible API client with streaming SSE support. Any provider that exposes `/v1/chat/completions`
works out of the box.

- `types.ts` — Standardized types (`Message`, `CompletionRequest`, `ToolDefinition`, etc.)
- `providers/completions.ts` — Generic completions provider with streaming and cost tracking
- `streaming/stream.ts` — SSE stream parser

### `packages/relay/core/` — Agent Loop & Tools

The agent loop is an async generator (`run()`) that streams `AgentEvent`s:

1. Build context (system prompt + history + tool definitions)
2. Stream LLM response, yielding `text_delta`, `tool_call_start`, `tool_call_args_delta`, `tool_call_end` events
3. Execute tool calls, yield `tool_result` events
4. Repeat until the LLM responds without tool calls (up to configurable max rounds)

**Built-in tools:**

| Tool (internal) | Display Name | Description                      |
| --------------- | ------------ | -------------------------------- |
| `bash`          | Run          | Execute shell commands           |
| `read_file`     | Read         | Read file contents               |
| `write_file`    | Write        | Write/create files (with diff)   |
| `edit_file`     | Edit         | Edit files with diff output      |
| `grep`          | Grep         | Search files with regex patterns |

**Session persistence** — Conversations are stored in the shared Turso database and can be shared by the terminal and
web clients. The terminal requires `TURSO_DB_URL`, `TURSO_DB_TOKEN`, and a shared `RELAY_OWNER_ID`:

- **Create** — New sessions with unique IDs and timestamps
- **Continue** — Resume the most recent session for a workspace
- **Open** — Load a specific session by opaque session ID
- **List** — Browse all sessions with summaries (first user message preview)
- **Cross-client** — A session started in the terminal can be continued on the web, and vice versa
- **Token tracking** — Per-session token and cost counts persisted in session metadata

Sessions store metadata plus ordered entries: user/assistant messages and tool results. The workspace path is part of
the session scope, so sessions from different projects remain separate.

### `packages/cli/tui/` — Terminal UI Framework

A custom terminal UI framework with:

- `theme.ts` — Centralized color theme
- **Custom JSX runtime** — Compiles JSX to VNodes, reconciles instance trees
- **Yoga layout** — Full flexbox support (direction, justify, align, wrap, gap, padding, absolute positioning)
- **Double-buffered rendering** — Flicker-free differential updates
- **Signals reactivity** — `@preact/signals-core` for automatic re-renders

**Components:**

| Component          | Description                                                 |
| ------------------ | ----------------------------------------------------------- |
| `<Box>`            | Flexbox container with borders, padding, background color   |
| `<Text>`           | Styled text (color, bold, italic, underline, strikethrough) |
| `<TextInput>`      | Text input with cursor and vim mode support                 |
| `<Spinner>`        | Animated spinner                                            |
| `<ScrollArea>`     | Scrollable container with scrollbar and auto-scroll         |
| `<Markdown>`       | Renders markdown as styled terminal text                    |
| `<CommandPalette>` | Fuzzy-searchable command menu overlay                       |

**Hooks:**

| Hook                      | Description                         |
| ------------------------- | ----------------------------------- |
| `useSignal(value)`        | Persistent reactive signal          |
| `useSignalEffect(fn)`     | Reactive side effect with cleanup   |
| `useTextInput(opts)`      | Text input state with vim mode      |
| `useScrollArea(opts)`     | Scroll state with keyboard control  |
| `useCommandPalette(opts)` | Command palette state and filtering |

### `packages/cli/agent/` — Application

Ties everything together into the interactive terminal agent:

- `system-prompt.md` — The system prompt for the agent
- Status bar with git branch, token usage progress bar, and cost tracking
- Scrollable chat history with markdown rendering
- Streaming tool call display
- Vim-mode text input
- Command palette (`/`) for actions like "New Chat" and "Quit"

## Development

```bash
deno task fmt          # Format code
deno task fmt:check    # Check formatting
deno task lint         # Lint
deno task test         # Run tests
deno task build        # Build binary (dist/relay)
deno task version      # Show current version
deno task version:bump <patch|minor|major>  # Bump version
```

### Playgrounds

Interactive demos for individual TUI components:

```bash
deno task playground:command-palette  # Command palette
deno task playground:layout           # Flexbox layout and borders
deno task playground:markdown         # Markdown rendering
deno task playground:scroll-area      # Scroll area
deno task playground:spinner          # Spinner animations
deno task playground:text-input       # Text input with vim mode
deno task playground:text-styling     # Text styling
deno task playground:welcome          # Welcome screen
```

## Releasing

> **Current status:** no new release is planned while the web extension work is in progress. `v0.8.0` remains the latest
> published release and predates the shared database session changes. The steps below apply once releases resume.

Tag-based releases via GitHub Actions (`.github/workflows/release.yml`):

1. `deno task version:bump <patch|minor|major>`
2. Commit and push to `main`
3. `git tag v<version> && git push --tags`
4. CI builds the Linux binary without embedding environment files and creates the GitHub Release

The released binary reads `LLM_API_KEY`, `TURSO_DB_URL`, `TURSO_DB_TOKEN`, and `RELAY_OWNER_ID` from its runtime
environment. Local `deno task build` builds may load `.env` automatically, but release builds should not include secrets
in the executable.

## License

MIT
