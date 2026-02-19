/**
 * Structured logger: pino-based, JSON in production, pretty in dev.
 */

import pino from "pino";

const level = process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "production" ? "info" : "debug");

export const logger = pino({
  level,
  ...(process.env.NODE_ENV !== "production" && {
    transport: { target: "pino/file", options: { destination: 1 } },
  }),
});

export function createChildLogger(module: string): pino.Logger {
  return logger.child({ module });
}
