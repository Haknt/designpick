#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import open from "open";

import { createSession, waitForSelection, getCurrentVariants, getSession, deleteSession } from "./session.js";
import { generateVariants, createMockVariants } from "./generator.js";
import { startWebServer, stopWebServer } from "./web-server.js";

const server = new McpServer({
  name: "designpick",
  version: "0.1.0",
});

let webServerUrl: string | null = null;

async function ensureWebServer(): Promise<string> {
  if (!webServerUrl) {
    webServerUrl = await startWebServer();
    console.error(`[designpick] Web server started at ${webServerUrl}`);
  }
  return webServerUrl;
}

// Tool: Generate variants and open comparison UI
server.tool(
  "designpick_generate",
  "Generate UI design variants from existing code and open a comparison page in the browser. Keeps the tool running until the user selects a winner.",
  {
    code: z.string().describe("The existing UI code (SwiftUI, React, HTML, Flutter, etc.)"),
    count: z.number().min(2).max(8).default(6).describe("Number of variants to generate (2-8)"),
    description: z.string().optional().describe("What kind of design changes to explore"),
    platform: z.string().default("html").describe("Source platform: swiftui, react, flutter, html"),
    mock: z.boolean().default(false).describe("Use mock variants instead of AI generation (for testing)"),
  },
  async ({ code, count, description, platform, mock }) => {
    try {
      // Generate variants
      let variants;
      if (mock) {
        variants = createMockVariants(count);
        console.error(`[designpick] Created ${count} mock variants`);
      } else {
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
          return {
            content: [
              {
                type: "text" as const,
                text: "Error: ANTHROPIC_API_KEY environment variable is not set. Set it or use mock:true for testing.",
              },
            ],
          };
        }
        console.error(`[designpick] Generating ${count} variants via Claude API...`);
        variants = await generateVariants(code, count, description || "", platform, apiKey);
        console.error(`[designpick] Generated ${variants.length} variants`);
      }

      // Create session
      const session = createSession(code, platform, description || "", variants);
      console.error(`[designpick] Session created: ${session.id}`);

      // Start web server and open browser
      const url = await ensureWebServer();
      const pageUrl = `${url}?session=${session.id}`;
      console.error(`[designpick] Opening browser: ${pageUrl}`);
      await open(pageUrl);

      // Wait for user selection
      console.error(`[designpick] Waiting for user selection...`);
      const resolved = await waitForSelection(session.id);

      // Get the selected variant
      const winner = resolved.rounds[resolved.currentRound - 1].variants.find(
        (v) => v.id === resolved.selectedVariantId
      );

      // Cleanup
      deleteSession(session.id);

      if (!winner) {
        return {
          content: [
            { type: "text" as const, text: "No variant was selected." },
          ],
        };
      }

      return {
        content: [
          {
            type: "text" as const,
            text: `Selected variant: ${winner.label} — ${winner.description}\n\nHTML:\n\`\`\`html\n${winner.html}\n\`\`\``,
          },
        ],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [
          { type: "text" as const, text: `Error: ${message}` },
        ],
      };
    }
  }
);

// Tool: List active sessions
server.tool(
  "designpick_status",
  "Check the status of an active DesignPick session",
  {
    session_id: z.string().describe("Session ID to check"),
  },
  async ({ session_id }) => {
    const session = getSession(session_id);
    if (!session) {
      return {
        content: [
          { type: "text" as const, text: "Session not found." },
        ],
      };
    }

    const variants = getCurrentVariants(session);
    return {
      content: [
        {
          type: "text" as const,
          text: `Session: ${session.id}\nRound: ${session.currentRound}\nRemaining variants: ${variants.length}\nResolved: ${session.resolved}`,
        },
      ],
    };
  }
);

// Start the MCP server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[designpick] MCP server started");
}

main().catch((err) => {
  console.error("[designpick] Fatal error:", err);
  process.exit(1);
});
