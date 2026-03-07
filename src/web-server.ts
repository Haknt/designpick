import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  getSession,
  getCurrentVariants,
  eliminateVariant,
  selectWinner,
} from "./session.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, "public");

let server: http.Server | null = null;

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
};

function serveStatic(
  res: http.ServerResponse,
  filePath: string
): void {
  const ext = path.extname(filePath);
  const mime = MIME_TYPES[ext] || "application/octet-stream";

  try {
    const content = fs.readFileSync(filePath, "utf-8");
    res.writeHead(200, { "Content-Type": mime });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
}

function handleApi(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  url: URL
): void {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const pathname = url.pathname;

  // GET /api/session/:id
  if (req.method === "GET" && pathname.startsWith("/api/session/")) {
    const sessionId = pathname.split("/")[3];
    const session = getSession(sessionId);
    if (!session) {
      res.writeHead(404);
      res.end(JSON.stringify({ error: "Session not found" }));
      return;
    }
    const variants = getCurrentVariants(session);
    res.writeHead(200);
    res.end(
      JSON.stringify({
        id: session.id,
        round: session.currentRound,
        description: session.description,
        platform: session.platform,
        variants,
        totalVariants: session.rounds[session.currentRound - 1].variants.length,
        eliminatedCount:
          session.rounds[session.currentRound - 1].eliminatedIds.length,
      })
    );
    return;
  }

  // POST /api/eliminate
  if (req.method === "POST" && pathname === "/api/eliminate") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      const { sessionId, variantId } = JSON.parse(body);
      const success = eliminateVariant(sessionId, variantId);
      res.writeHead(success ? 200 : 400);
      res.end(JSON.stringify({ success }));
    });
    return;
  }

  // POST /api/select
  if (req.method === "POST" && pathname === "/api/select") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      const { sessionId, variantId } = JSON.parse(body);
      const success = selectWinner(sessionId, variantId);
      res.writeHead(success ? 200 : 400);
      res.end(JSON.stringify({ success }));
    });
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: "Not found" }));
}

export function startWebServer(port: number = 3847): Promise<string> {
  return new Promise((resolve, reject) => {
    server = http.createServer((req, res) => {
      const url = new URL(req.url || "/", `http://localhost:${port}`);

      if (url.pathname.startsWith("/api/")) {
        handleApi(req, res, url);
        return;
      }

      // Serve static files
      let filePath = path.join(PUBLIC_DIR, url.pathname);
      if (url.pathname === "/" || url.pathname === "") {
        filePath = path.join(PUBLIC_DIR, "index.html");
      }
      serveStatic(res, filePath);
    });

    server.listen(port, () => {
      const address = `http://localhost:${port}`;
      resolve(address);
    });

    server.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        // Try next port
        resolve(startWebServer(port + 1));
      } else {
        reject(err);
      }
    });
  });
}

export function stopWebServer(): void {
  if (server) {
    server.close();
    server = null;
  }
}
