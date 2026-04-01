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
const server = app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`[DebtSight] Server listening on http://localhost:${port}`);
});

server.on("error", (err) => {
  // eslint-disable-next-line no-console
  console.error("[DebtSight] Server error:", err);
});
