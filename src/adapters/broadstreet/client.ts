import { AdapterError } from "../../core/errors.js";

export class BroadstreetClient {
  private readonly baseUrl = "https://api.broadstreetads.com/api/0";

  constructor(
    public readonly apiKey: string,
    public readonly networkId: string
  ) {}

  private async request(method: string, path: string, body?: unknown): Promise<any> {
    const url = `${this.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
    
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      Accept: "application/json",
    };

    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new AdapterError(`Broadstreet API error ${response.status}: ${errorText}`, "broadstreet");
    }

    // Try parsing as JSON; if empty or fails, return empty object
    try {
      const text = await response.text();
      return text ? JSON.parse(text) : {};
    } catch {
      return {};
    }
  }

  async get(path: string): Promise<any> {
    return this.request("GET", path);
  }

  async post(path: string, body: unknown): Promise<any> {
    return this.request("POST", path, body);
  }

  async put(path: string, body: unknown): Promise<any> {
    return this.request("PUT", path, body);
  }
}
