# designpick

Visual design comparison tool for AI coding agents. When an AI generates multiple UI variants, designpick renders them side-by-side and lets you pick your favorite — directly from your terminal.

## How it works

1. AI agent generates 2–8 HTML design variants
2. designpick opens a browser UI showing all variants side-by-side
3. You compare, select your favorite, and optionally leave feedback
4. The selected variant's HTML is returned to the AI agent

## Setup with Claude Code

### 1. Clone & build

```bash
git clone https://github.com/Haknt/designpick.git
cd designpick
npm install
npm run build
```

### 2. Add as MCP server

Open (or create) `~/.claude/.mcp.json` and add:

```json
{
  "mcpServers": {
    "designpick": {
      "command": "node",
      "args": ["/absolute/path/to/designpick/dist/index.js"]
    }
  }
}
```

Replace `/absolute/path/to/designpick` with the actual path where you cloned the repo.

### 3. Restart Claude Code

Close and reopen Claude Code. You should see `designpick` in your available MCP tools.

## Usage

Once configured, just ask Claude Code to generate design alternatives. For example:

> "Design 3 different login page variants and let me pick"

> "Show me A/B options for the dashboard layout"

> "Create a card component with dark and light theme variants, let me compare"

Claude will automatically use the `designpick_compare` tool to render the variants in your browser for visual comparison.

### What you can do in the comparison UI

- **Preview** each variant in a live HTML iframe
- **Select** your preferred variant
- **Dislike** variants you don't want
- **Leave feedback** for the AI to refine the design
- **Reject all** if none of the variants work

## API

### Tool: `designpick_compare`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `variants` | array (2–8) | yes | Design variants to compare |
| `variants[].label` | string | yes | Short label (e.g. "A", "B") |
| `variants[].html` | string | yes | Complete self-contained HTML |
| `variants[].description` | string | no | One-line summary |
| `description` | string | no | What is being compared |

## License

MIT
