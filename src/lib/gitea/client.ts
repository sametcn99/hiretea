import { getResolvedGiteaAdminConfig } from "@/lib/gitea/runtime-config";

type GiteaRequestOptions = RequestInit & {
  searchParams?: URLSearchParams;
};

type GiteaErrorPayload = {
  message?: string;
};

export class GiteaAdminClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "GiteaAdminClientError";
  }
}

export class GiteaAdminClient {
  constructor(
    private readonly baseUrl: string,
    private readonly token: string,
  ) {}

  async request<T>(path: string, options: GiteaRequestOptions = {}) {
    const url = new URL(
      path.replace(/^\//, ""),
      `${this.baseUrl.replace(/\/$/, "")}/api/v1/`,
    );

    if (options.searchParams) {
      url.search = options.searchParams.toString();
    }

    const response = await fetch(url, {
      ...options,
      cache: "no-store",
      headers: {
        Accept: "application/json",
        Authorization: `token ${this.token}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      let message = `Gitea request failed with status ${response.status}.`;

      try {
        const errorPayload = (await response.json()) as GiteaErrorPayload;

        if (errorPayload.message) {
          message = errorPayload.message;
        }
      } catch {
        const errorText = await response.text().catch(() => "");

        if (errorText) {
          message = errorText;
        }
      }

      throw new GiteaAdminClientError(message, response.status);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }
}

export function createGiteaAdminClient(baseUrl: string, token: string) {
  return new GiteaAdminClient(baseUrl, token);
}

export async function getGiteaAdminClient() {
  const config = await getResolvedGiteaAdminConfig();

  return new GiteaAdminClient(config.baseUrl, config.token);
}
