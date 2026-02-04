# AGENTS.md - TUI Framework

A terminal UI framework using a custom JSX runtime, Yoga layout engine for flexbox positioning, and ANSI escape codes
for rendering.

## Architecture Overview

```
tui/
├── core/                 # Low-level terminal handling
│   ├── terminal.ts       # Terminal buffer, rendering, cursor control
│   ├── input.ts          # Keyboard input handling
│   └── primitives/       # Drawing primitives
│       ├── draw-box.ts   # Box/border rendering with styles
│       ├── format-text.ts# Text styling (bold, italic, colors)
│       └── wrap-text.ts  # Text wrapping utilities
├── render/               # JSX rendering layer
│   ├── renderer.ts       # Custom renderer with Yoga layout
│   ├── components.tsx    # Box, Text, TextInput components
│   ├── jsx-runtime.ts    # Custom JSX runtime
│   ├── hooks/            # React-like hooks
│   │   ├── signals.ts    # useSignal, useSignalEffect
│   │   ├── text-input.ts # useTextInput hook
│   │   ├── vim-input.ts  # useVimInput hook
│   │   └── text-utils.ts # Shared text editing utilities
│   ├── elements/         # Element handlers for rendering
│   │   ├── index.ts      # Element registry
│   │   ├── box.ts        # Box element renderer
│   │   ├── text.ts       # Text element renderer
│   │   └── text-input.ts # TextInput element renderer
│   └── types/
│       └── index.ts      # TypeScript type definitions
└── playground/           # Example apps
    └── text-input.tsx    # Text input demo
```

## Key Concepts

### Rendering Pipeline

1. **VNode Creation**: JSX compiles to custom `jsx()` calls returning VNodes
2. **Instance Tree**: `Renderer.createInstanceTree()` converts VNodes to Instance objects with Yoga nodes
3. **Layout Calculation**: Yoga calculates positions using flexbox algorithm
4. **Element Rendering**: Element handlers convert instances to Position arrays
5. **Terminal Output**: `Terminal.render()` writes positions to a double-buffered character grid
6. **Differential Flush**: Only changed cells are written to stdout

### Core Classes

#### `Terminal` (core/terminal.ts)

- Double-buffered rendering for flicker-free updates
- Manages character grid with styles per cell
- Tracks cursor state to avoid redundant escape sequences
- Methods: `render(positions)`, `clear()`, `showCursor()`, `hideCursor()`

#### `Renderer` (render/renderer.ts)

- Bridges VNodes to terminal output
- Creates Yoga layout tree from component tree
- Uses `@preact/signals-core` effect() for reactive re-rendering
- Methods: `render(createVNode)`, `unmount()`

### Signals Integration

The framework uses `@preact/signals-core` for reactivity:

- `useSignal(initialValue)` - Creates a persistent signal (cached by component/hook index)
- `useSignalEffect(fn)` - Runs effect when signals change, with cleanup support
- Signals trigger automatic re-renders when `.value` changes

### Layout System (Yoga)

Supports flexbox properties on `<Box>`:

- `flex`, `flexDirection` (row/column/row-reverse/column-reverse)
- `justifyContent`, `alignItems`
- `gap`, `padding`
- `width`, `height`
- `border` (single/double/round/bold/dash/block), `borderColor`, `borderLabel`

### Styling

Text styling via `<Text>` props:

- `color` - Basic colors (red, blue, etc.), bright variants, or hex codes (#ff0000)
- `bold`, `italic`, `underline`, `strikethrough`

## Adding New Features

### New Component Property

1. Add prop to type in `render/types/index.ts`
2. Handle in `Renderer.applyBoxLayout()` or `createInstanceTree()`
3. Handle in element handler (`render/elements/box.ts`, `render/elements/text.ts`, etc.)

### New Primitive

1. Create file in `core/primitives/`
2. Return `Position[]` array for terminal rendering
3. Use in element handlers

### New Element Type

1. Add type to `Instance` union in `render/types/index.ts`
2. Create element handler in `render/elements/`
3. Register in `render/elements/index.ts`
4. Add to JSX IntrinsicElements in `render/jsx-runtime.ts`

## Code Patterns

- Element handlers are pure functions: `(instance, context) => Position[]`
- Hooks use global index tracking (reset per render cycle)
- Use `toAnsi(colorName)` from `@/tui/core/primitives/color.ts` for color conversion
- All coordinates are integer character positions
- Text editing logic is centralized in `hooks/text-utils.ts`

## Naming Conventions

- **Element type strings**: camelCase (e.g., `"textInput"`, `"selectInput"`)
- **File names**: kebab-case (e.g., `text-input.ts`, `draw-box.ts`)
- **Functions/variables**: camelCase (e.g., `textInputLayout`, `getElement`)
- **Types/Interfaces**: PascalCase (e.g., `TextInputProps`, `ElementHandler`)
- **Constants**: UPPER_SNAKE_CASE for enum-like objects (e.g., `ElementType.TEXT_INPUT`)
- **JSX intrinsic elements**: camelCase (e.g., `<textInput />`) - internal use only
- **Component wrappers**: PascalCase (e.g., `<TextInput />`, `<Box />`) - what users import
