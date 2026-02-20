import express, { Router } from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createSchemasRouter(): Router {
  const router = Router();
  // Serve static files from src/static/schemas/adcp/v2.4/ mounted at /api/adcp/v2.4/
  const schemasPath = path.resolve(__dirname, "../../static/schemas/adcp/v2.4");
  router.use("/adcp/v2.4", express.static(schemasPath));
  return router;
}
