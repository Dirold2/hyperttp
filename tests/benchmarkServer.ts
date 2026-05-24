import http from "node:http";
import { randomBytes } from "node:crypto";

const LARGE_PAYLOAD = JSON.stringify({
  ok: true,
  payload: randomBytes(1024 * 512).toString("hex"),
});

function send(
  res: http.ServerResponse,
  data: string,
  contentType: string,
  status = 200,
) {
  res.statusCode = status;
  res.setHeader("Content-Type", contentType);
  res.end(data);
}

function json(res: http.ServerResponse, data: unknown, status = 200) {
  send(res, JSON.stringify(data), "application/json", status);
}

export function createBenchmarkServer() {
  return http.createServer(async (req, res) => {
    const url = req.url ?? "/";
    const parsedUrl = new URL(url, "http://localhost:3000");
    const pathname = parsedUrl.pathname;
    const method = req.method ?? "GET";

    if (pathname === "/") {
      return json(res, {
        ok: true,
        name: "Hyperttp Benchmark Server",
        routes: {
          json: "/json",
          xml: "/xml",
          html: "/html",
          cache: "/cache",
          dedup: "/dedup",
          delay: "/delay/:seconds",
          large: "/large",
          stream: "/stream",
          slowStream: "/slow-stream",
          get: "/get",
          post: "/post",
          status: "/status/:code",
        },
      });
    }

    if (pathname === "/json") {
      return json(res, {
        ok: true,
        timestamp: Date.now(),
        random: Math.random(),
      });
    }

    if (pathname === "/cache") {
      res.setHeader("Cache-Control", "public, max-age=3600");

      return json(res, {
        ok: true,
        cached: true,
        static: "constant-response",
      });
    }

    if (pathname === "/dedup") {
      await new Promise((resolve) => setTimeout(resolve, 100));

      return json(res, {
        ok: true,
        dedup: true,
        timestamp: Date.now(),
      });
    }

    if (pathname === "/large") {
      res.setHeader("Content-Type", "application/json");
      return res.end(LARGE_PAYLOAD);
    }

    if (pathname === "/xml") {
      return send(
        res,
        `<?xml version="1.0" encoding="UTF-8"?>
<root>
  <ok>true</ok>
  <type>xml</type>
</root>`,
        "application/xml",
      );
    }

    if (pathname === "/html") {
      return send(
        res,
        `<!DOCTYPE html>
<html>
<body>
<h1>Hyperttp</h1>
</body>
</html>`,
        "text/html",
      );
    }

    if (pathname === "/get") {
      return send(
        res,
        `ok method=${method} query=${parsedUrl.search}`,
        "text/plain",
      );
    }

    if (pathname === "/post" && method === "POST") {
      let body = "";

      req.on("data", (chunk: Buffer) => {
        body += chunk.toString();
      });

      req.on("end", () => {
        send(res, `ok method=${method} body=${body}`, "text/plain");
      });

      return;
    }

    if (pathname.startsWith("/status/")) {
      const code = Number(pathname.split("/")[2]) || 500;

      if (code >= 300 && code < 400) {
        res.writeHead(code, {
          Location: "http://localhost:3000/json",
          "Content-Type": "text/plain",
        });
        return res.end(`Redirecting to /json with status ${code}`);
      }

      return json(res, { ok: code >= 200 && code < 300, status: code }, code);
    }

    if (pathname.startsWith("/delay/")) {
      const seconds = Number(pathname.split("/")[2]) || 1;

      await new Promise((resolve) => setTimeout(resolve, seconds * 1000));

      return json(res, {
        ok: true,
        delayed: seconds,
      });
    }

    if (pathname === "/stream") {
      res.writeHead(200, {
        "Content-Type": "text/plain",
        "Transfer-Encoding": "chunked",
      });

      let i = 0;

      const interval = setInterval(() => {
        res.write(`chunk-${i}\n`);
        i++;

        if (i >= 5) {
          clearInterval(interval);
          res.end("done\n");
        }
      }, 200);

      req.on("close", () => {
        clearInterval(interval);
      });

      return;
    }

    if (pathname === "/slow-stream") {
      res.writeHead(200, {
        "Content-Type": "text/plain",
        "Transfer-Encoding": "chunked",
      });

      let i = 0;

      const interval = setInterval(() => {
        res.write(randomBytes(1024).toString("hex"));
        i++;

        if (i >= 20) {
          clearInterval(interval);
          res.end();
        }
      }, 1000);

      req.on("close", () => {
        clearInterval(interval);
      });

      return;
    }

    if (pathname.startsWith("/stream/")) {
      const count = Number(pathname.split("/")[2]) || 5;

      res.writeHead(200, {
        "Content-Type": "text/plain",
        "Transfer-Encoding": "chunked",
      });

      let i = 0;

      const interval = setInterval(() => {
        res.write(`chunk-${i}\n`);
        i++;

        if (i >= count) {
          clearInterval(interval);
          res.end("done\n");
        }
      }, 200);

      req.on("close", () => {
        clearInterval(interval);
      });

      return;
    }

    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
  });
}
