import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import aiRoutes from "./routes/aiRoutes.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: process.env.JSON_LIMIT || "2mb" }));
app.use((req, _res, next) => {
  // eslint-disable-next-line no-console
  console.log(`[DebtSight] ${req.method} ${req.originalUrl}`);
  next();
});

app.get("/", (_req, res) => {
  res.status(200).send("DebtSight API is running");
});

/** Use this in Postman/browser to confirm you reached *this* server (correct port + build). */
app.get("/api-info", (_req, res) => {
  res.status(200).json({
    service: "DebtSight",
    port: Number(process.env.PORT) || 3000,
    endpoints: [
      "GET /",
      "GET /api-info",
      "POST /analyze-debt",
      "POST /explain-code",
      "POST /modernize-code",
      "POST /rewrite-codebase",
      "POST /translate-code",
    ],
  });
});

app.use("/", aiRoutes);

app.use((err, _req, res, _next) => {
  const status = Number(err?.status) || 500;
  const shouldExpose =
    Boolean(err?.expose) || status === 429 || status === 502 || status < 500;
  const message = shouldExpose
    ? err?.message || "Request failed"
    : "Internal server error";

  if (status >= 500) {
    // eslint-disable-next-line no-console
    console.error("[DebtSight] Unhandled error:", err);
  }

  res.status(status).json({
    error: message,
    ...(err?.retry_after_seconds
      ? { retry_after_seconds: err.retry_after_seconds }
      : {}),
  });
});

const port = Number(process.env.PORT) || 3000;
const server = app.listen(port);

server.on("listening", () => {
  // eslint-disable-next-line no-console
  console.log(`[DebtSight] Server listening on http://localhost:${port}`);
  // eslint-disable-next-line no-console
  console.log(
    `[DebtSight] Try GET http://localhost:${port}/api-info then POST http://localhost:${port}/translate-code`
  );
});

server.on("error", (err) => {
  if (err?.code === "EADDRINUSE") {
    // eslint-disable-next-line no-console
    console.error(
      `[DebtSight] Port ${port} is already in use. Another process (usually an OLD node server) is still running.`
    );
    // eslint-disable-next-line no-console
    console.error(
      `[DebtSight] Fix: find and kill it, then start again:\n` +
        `  netstat -ano | findstr :${port}\n` +
        `  taskkill /PID <pid_from_last_column> /F\n` +
        `  node server.js`
    );
    // eslint-disable-next-line no-console
    console.error(
      `[DebtSight] Or use a different port: set PORT=3001 in .env and open http://localhost:3001/api-info`
    );
    process.exit(1);
  }
  // eslint-disable-next-line no-console
  console.error("[DebtSight] Server error:", err);
  process.exit(1);
});
