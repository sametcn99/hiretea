import { spawnSync } from "node:child_process";

type StackMode = "bundled" | "external";

type WaitTarget = {
  service: string;
  containerPort: number;
  path: string;
  label: string;
};

type StackConfig = {
  composeFile: string;
  projectName: string;
  targets: WaitTarget[];
};

const stackMode = process.argv[2];

if (stackMode !== "bundled" && stackMode !== "external") {
  console.error("Usage: bun run docker/scripts/wait-for-stack.ts <bundled|external>");
  process.exit(1);
}

const waitIntervalMs = parsePositiveInteger(
  process.env.HIRETEA_DOCKER_WAIT_INTERVAL_MS,
  2_000,
);
const waitTimeoutMs = parsePositiveInteger(
  process.env.HIRETEA_DOCKER_WAIT_TIMEOUT_MS,
  240_000,
);

const stackConfigs: Record<StackMode, StackConfig> = {
  bundled: {
    composeFile: "docker-compose.bundled.yml",
    projectName: "hiretea-bundled",
    targets: [
      {
        service: "app",
        containerPort: 3000,
        path: "/api/health",
        label: "Hiretea app",
      },
      {
        service: "gitea",
        containerPort: 3000,
        path: "/user/login",
        label: "Bundled Gitea",
      },
    ],
  },
  external: {
    composeFile: "docker-compose.external.yml",
    projectName: "hiretea-external",
    targets: [
      {
        service: "app",
        containerPort: 3000,
        path: "/api/health",
        label: "Hiretea app",
      },
    ],
  },
};

const stackConfig = stackConfigs[stackMode];

function parsePositiveInteger(rawValue: string | undefined, fallback: number) {
  if (!rawValue) {
    return fallback;
  }

  const parsedValue = Number.parseInt(rawValue, 10);

  return Number.isFinite(parsedValue) && parsedValue > 0
    ? parsedValue
    : fallback;
}

function runCompose(args: string[]) {
  const result = spawnSync(
    "docker",
    ["compose", "-p", stackConfig.projectName, "-f", stackConfig.composeFile, ...args],
    {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  return {
    exitCode: result.status ?? 1,
    stdout: result.stdout.trim(),
    stderr: result.stderr.trim(),
  };
}

function normalizePublishedHost(publishedAddress: string) {
  const ipv6Match = publishedAddress.match(/^\[(.+)\]:(\d+)$/);

  if (ipv6Match) {
    const [, host, port] = ipv6Match;
    return {
      host: host === "::" ? "127.0.0.1" : host,
      port,
    };
  }

  const separatorIndex = publishedAddress.lastIndexOf(":");

  if (separatorIndex === -1) {
    return null;
  }

  const host = publishedAddress.slice(0, separatorIndex);
  const port = publishedAddress.slice(separatorIndex + 1);

  return {
    host: host === "0.0.0.0" || host === "::" ? "127.0.0.1" : host,
    port,
  };
}

function getPublishedUrl(target: WaitTarget) {
  const portResult = runCompose(["port", target.service, String(target.containerPort)]);

  if (portResult.exitCode !== 0 || !portResult.stdout) {
    return null;
  }

  const publishedAddress = portResult.stdout
    .split("\n")
    .map((value) => value.trim())
    .find(Boolean);

  if (!publishedAddress) {
    return null;
  }

  const normalizedAddress = normalizePublishedHost(publishedAddress);

  if (!normalizedAddress) {
    return null;
  }

  return `http://${normalizedAddress.host}:${normalizedAddress.port}${target.path}`;
}

function formatComposeDebugState() {
  const psResult = runCompose(["ps"]);
  const logsResult = runCompose(["logs", "--tail", "50"]);

  if (psResult.stdout) {
    console.error("\nCurrent compose state:\n");
    console.error(psResult.stdout);
  }

  if (logsResult.stdout) {
    console.error("\nRecent compose logs:\n");
    console.error(logsResult.stdout);
  }
}

async function sleep(durationMs: number) {
  await new Promise((resolve) => setTimeout(resolve, durationMs));
}

async function waitForTarget(target: WaitTarget) {
  const deadline = Date.now() + waitTimeoutMs;
  let lastKnownUrl: string | null = null;
  let lastFailure = "Port mapping is not available yet.";

  while (Date.now() < deadline) {
    const targetUrl = getPublishedUrl(target);

    if (!targetUrl) {
      await sleep(waitIntervalMs);
      continue;
    }

    lastKnownUrl = targetUrl;

    try {
      const response = await fetch(targetUrl, {
        redirect: "manual",
      });

      if (response.status === 200) {
        console.log(`${target.label} is ready at ${targetUrl}`);
        return;
      }

      lastFailure = `Received HTTP ${response.status}.`;
    } catch (error) {
      lastFailure = error instanceof Error ? error.message : "Request failed.";
    }

    await sleep(waitIntervalMs);
  }

  console.error(
    `Timed out waiting for ${target.label}${lastKnownUrl ? ` at ${lastKnownUrl}` : ""}. ${lastFailure}`,
  );

  formatComposeDebugState();
  process.exit(1);
}

async function main() {
  console.log(
    `Waiting for ${stackMode} compose services to become reachable (timeout ${Math.round(waitTimeoutMs / 1_000)}s)...`,
  );

  for (const target of stackConfig.targets) {
    await waitForTarget(target);
  }
}

await main();