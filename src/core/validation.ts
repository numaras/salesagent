/**
 * Server-side validation utilities.
 * Ported from python_src validation helpers.
 */

import { ValidationError } from "./errors.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_RE = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;

/**
 * Throw ValidationError if the value is null, undefined, or empty string.
 */
export function validateRequired(value: unknown, fieldName: string): void {
  if (value === null || value === undefined) {
    throw new ValidationError(`${fieldName} is required`);
  }
  if (typeof value === "string" && value.trim().length === 0) {
    throw new ValidationError(`${fieldName} must not be empty`);
  }
}

/**
 * Validate email format. Throws ValidationError on invalid input.
 */
export function validateEmail(email: string): void {
  validateRequired(email, "email");
  if (!EMAIL_RE.test(email)) {
    throw new ValidationError(`Invalid email format: ${email}`);
  }
}

/**
 * Validate URL format (http/https). Throws ValidationError on invalid input.
 */
export function validateUrl(url: string): void {
  validateRequired(url, "url");
  if (!URL_RE.test(url)) {
    throw new ValidationError(`Invalid URL format: ${url}`);
  }
}

/**
 * Validate that startDate is strictly before endDate.
 */
export function validateDateRange(startDate: Date, endDate: Date): void {
  if (startDate >= endDate) {
    throw new ValidationError(
      `Start date (${startDate.toISOString()}) must be before end date (${endDate.toISOString()})`
    );
  }
}

/**
 * Format an array of validation error messages into a structured error object.
 */
export function formatValidationErrors(
  errors: string[]
): { error: "VALIDATION_ERROR"; details: string[] } {
  return { error: "VALIDATION_ERROR", details: errors };
}
