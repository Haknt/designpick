import Anthropic from "@anthropic-ai/sdk";
import { Variant } from "./session.js";

const LABELS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export async function generateVariants(
  code: string,
  count: number,
  description: string,
  platform: string,
  apiKey: string
): Promise<Variant[]> {
  const client = new Anthropic({ apiKey });

  const prompt = `You are a UI design expert. Given the following ${platform} code, generate ${count} visually distinct HTML/CSS design variants.

ORIGINAL CODE:
\`\`\`
${code}
\`\`\`

${description ? `DESIGN DIRECTION: ${description}` : ""}

RULES:
- Each variant must be a COMPLETE, self-contained HTML snippet (with inline CSS or <style> tag)
- Each variant should look visually different (layout, spacing, colors, typography, borders, shadows, etc.)
- Keep the same functional structure/content but vary the visual design
- Use modern CSS (flexbox/grid, custom properties, etc.)
- Dark theme preferred (dark background, light text)
- Each variant should be production-quality, not generic/AI-slop
- Add subtle, tasteful details that differentiate each variant

RESPONSE FORMAT:
Return EXACTLY ${count} variants as a JSON array. Each element:
{
  "label": "A",
  "description": "One-line description of what makes this variant unique",
  "html": "<!DOCTYPE html><html>...</html>"
}

Return ONLY the JSON array, no markdown fences, no explanation.`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 16000,
    messages: [{ role: "user", content: prompt }],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  let parsed: Array<{ label: string; description: string; html: string }>;
  try {
    parsed = JSON.parse(text);
  } catch {
    // Try extracting JSON from potential markdown fences
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) throw new Error("Failed to parse AI response as JSON");
    parsed = JSON.parse(match[0]);
  }

  return parsed.map((item, i) => ({
    id: `v${i + 1}`,
    label: item.label || LABELS[i] || `V${i + 1}`,
    description: item.description,
    html: item.html,
    eliminated: false,
  }));
}

export function createMockVariants(count: number): Variant[] {
  const colors = [
    "#6366f1",
    "#ec4899",
    "#14b8a6",
    "#f59e0b",
    "#8b5cf6",
    "#06b6d4",
  ];

  return Array.from({ length: count }, (_, i) => ({
    id: `v${i + 1}`,
    label: LABELS[i] || `V${i + 1}`,
    description: `Variant ${LABELS[i]}: ${["Rounded with soft shadows", "Sharp edges, high contrast", "Minimal with generous spacing", "Compact with accent borders", "Gradient background, glass effect", "Outlined with dotted borders"][i] || "Alternative design"}`,
    html: `<!DOCTYPE html>
<html>
<head><style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #0a0a0a; color: #e5e5e5; font-family: -apple-system, system-ui, sans-serif; padding: 24px; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
  .card { background: #161616; border: 1px solid ${colors[i]}33; border-radius: ${[12, 2, 16, 6, 12, 8][i]}px; padding: ${[24, 20, 32, 16, 24, 20][i]}px; max-width: 320px; width: 100%; ${[
      `box-shadow: 0 4px 24px ${colors[i]}15;`,
      `border-width: 2px;`,
      ``,
      `border-left: 3px solid ${colors[i]};`,
      `background: linear-gradient(135deg, #161616, ${colors[i]}10);`,
      `border-style: dashed;`,
    ][i]} }
  .card h3 { font-size: ${[18, 16, 20, 14, 18, 16][i]}px; font-weight: 600; margin-bottom: 8px; color: ${colors[i]}; }
  .card p { font-size: 14px; color: #999; line-height: 1.5; }
  .card .badge { display: inline-block; margin-top: 12px; padding: 4px 10px; border-radius: 99px; font-size: 12px; background: ${colors[i]}20; color: ${colors[i]}; }
</style></head>
<body>
  <div class="card">
    <h3>Project Alpha</h3>
    <p>A sample card component showing the design variant approach.</p>
    <span class="badge">Active</span>
  </div>
</body>
</html>`,
    eliminated: false,
  }));
}
