/**
 * Naming helpers for GAM orders and line items.
 * Templates use `{var}` placeholders replaced at runtime.
 */

function applyTemplate(
  template: string,
  vars: Record<string, string>
): string {
  return template.replace(/\{(\w+)\}/g, (_match, key: string) => vars[key] ?? "");
}

/** Generate an order name from a template and variable map. */
export function generateOrderName(
  template: string,
  vars: Record<string, string>
): string {
  return applyTemplate(template, vars);
}

/** Generate a line item name from a template and variable map. */
export function generateLineItemName(
  template: string,
  vars: Record<string, string>
): string {
  return applyTemplate(template, vars);
}
