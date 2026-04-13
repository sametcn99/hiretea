import type { OAuthConfig } from "next-auth/providers/oauth";

type GiteaProfile = {
  id: number;
  login: string;
  email?: string | null;
  avatar_url?: string | null;
  full_name?: string | null;
};

type GiteaProviderOptions = {
  clientId: string;
  clientSecret: string;
  issuer: string;
  internalBaseUrl?: string;
};

export function createGiteaProvider(options: GiteaProviderOptions) {
  const issuer = options.issuer.replace(/\/$/, "");
  const internalBaseUrl = (options.internalBaseUrl ?? options.issuer).replace(
    /\/$/,
    "",
  );

  return {
    id: "gitea",
    name: "Gitea",
    type: "oauth",
    allowDangerousEmailAccountLinking: true,
    clientId: options.clientId,
    clientSecret: options.clientSecret,
    authorization: {
      url: `${issuer}/login/oauth/authorize`,
      params: {
        scope: "read:user user:email",
      },
    },
    token: `${internalBaseUrl}/login/oauth/access_token`,
    userinfo: `${internalBaseUrl}/login/oauth/userinfo`,
    profile(profile: GiteaProfile) {
      return {
        id: String(profile.id),
        name: profile.full_name ?? profile.login,
        email: profile.email ?? null,
        image: profile.avatar_url ?? null,
        role: "CANDIDATE",
        isActive: true,
      };
    },
    style: {
      bg: "#101923",
      logo: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23f5f9fc' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 18 12 6l6 12'/%3E%3C/svg%3E",
      text: "#f5f9fc",
    },
  } satisfies OAuthConfig<GiteaProfile>;
}
