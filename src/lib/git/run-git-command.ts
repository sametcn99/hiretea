import { execFile } from "node:child_process";
import { tmpdir } from "node:os";
import { isAbsolute } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const DEFAULT_TIMEOUT_MS = 120_000;
const MAX_TIMEOUT_MS = 600_000;
const MAX_OUTPUT_BUFFER = 1024 * 1024;
const blockedEnvironmentVariables = [
  "GIT_ASKPASS",
  "GIT_CONFIG",
  "GIT_CONFIG_COUNT",
  "GIT_CONFIG_GLOBAL",
  "GIT_CONFIG_SYSTEM",
  "GIT_DIR",
  "GIT_EXEC_PATH",
  "GIT_INDEX_FILE",
  "GIT_OBJECT_DIRECTORY",
  "GIT_SSH",
  "GIT_SSH_COMMAND",
  "GIT_TRACE",
  "GIT_TRACE_PACKET",
  "GIT_WORK_TREE",
  "SSH_ASKPASS",
];
const blockedArgumentPrefixes = [
  "-c",
  "--config",
  "--config-env",
  "-C",
  "--exec-path",
  "--git-dir",
  "--work-tree",
  "-u",
  "--upload-pack",
  "--receive-pack",
];
const gitConfigKeyPattern = /^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)+$/i;

type GitConfigEntry = {
  key: string;
  value: string;
};

export type RunGitCommandInput = {
  args: string[];
  config?: GitConfigEntry[];
  cwd?: string;
  gitDir?: string;
  timeoutMs?: number;
  errorContext?: string;
};

export type RunGitCommandResult = {
  stdout: string;
  stderr: string;
};

function assertSafeText(value: string, label: string) {
  if (value.length === 0) {
    throw new Error(`${label} cannot be empty.`);
  }

  if (
    [...value].some((character) => {
      const codePoint = character.codePointAt(0);

      return codePoint != null && (codePoint <= 31 || codePoint === 127);
    })
  ) {
    throw new Error(`${label} contains unsupported control characters.`);
  }
}

function assertSafeAbsolutePath(value: string, label: string) {
  assertSafeText(value, label);

  if (!isAbsolute(value)) {
    throw new Error(`${label} must be an absolute path.`);
  }
}

function assertSafeArgument(argument: string, index: number) {
  assertSafeText(argument, `Git argument ${index + 1}`);

  const blockedPrefix = blockedArgumentPrefixes.find(
    (prefix) => argument === prefix || argument.startsWith(`${prefix}=`),
  );

  if (blockedPrefix) {
    throw new Error(
      `Git argument ${index + 1} uses blocked option ${blockedPrefix}.`,
    );
  }
}

function assertSafeConfigEntry(entry: GitConfigEntry, index: number) {
  assertSafeText(entry.key, `Git config key ${index + 1}`);
  assertSafeText(entry.value, `Git config value ${index + 1}`);

  if (!gitConfigKeyPattern.test(entry.key)) {
    throw new Error(`Git config key ${index + 1} is invalid.`);
  }
}

function sanitizeGitOutput(output: string) {
  return output
    .replace(
      /(Authorization:\s*(?:Basic|Bearer)\s+)[^\s'"\]]+/gi,
      "$1[REDACTED]",
    )
    .replace(/(https?:\/\/)[^\s/@]+@/gi, "$1[REDACTED]@");
}

function buildGitArguments(input: RunGitCommandInput) {
  if (input.args.length === 0) {
    throw new Error("Git command requires at least one argument.");
  }

  if (input.args[0]?.startsWith("-")) {
    throw new Error("Git command must start with a subcommand.");
  }

  input.args.forEach((argument, index) => {
    assertSafeArgument(argument, index);
  });

  const gitArguments: string[] = [];

  if (input.gitDir) {
    assertSafeAbsolutePath(input.gitDir, "gitDir");
    gitArguments.push(`--git-dir=${input.gitDir}`);
  }

  input.config?.forEach((entry, index) => {
    assertSafeConfigEntry(entry, index);
    gitArguments.push("-c", `${entry.key}=${entry.value}`);
  });

  gitArguments.push(...input.args);

  return gitArguments;
}

function resolveTimeout(timeoutMs?: number) {
  if (timeoutMs == null) {
    return DEFAULT_TIMEOUT_MS;
  }

  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
    throw new Error("timeoutMs must be a positive integer.");
  }

  return Math.min(timeoutMs, MAX_TIMEOUT_MS);
}

function buildGitEnvironment(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
  };

  blockedEnvironmentVariables.forEach((key) => {
    delete env[key];
  });

  env.PATH = process.env.PATH ?? "";
  env.HOME = process.env.HOME ?? tmpdir();
  env.TMPDIR = process.env.TMPDIR ?? tmpdir();
  env.LANG = "C";
  env.LC_ALL = "C";
  env.GIT_TERMINAL_PROMPT = "0";

  return env;
}

export async function runGitCommand(
  input: RunGitCommandInput,
): Promise<RunGitCommandResult> {
  const args = buildGitArguments(input);
  const timeout = resolveTimeout(input.timeoutMs);

  if (input.cwd) {
    assertSafeAbsolutePath(input.cwd, "cwd");
  }

  try {
    const result = await execFileAsync("git", args, {
      cwd: input.cwd,
      timeout,
      maxBuffer: MAX_OUTPUT_BUFFER,
      env: buildGitEnvironment(),
    });

    return {
      stdout: result.stdout,
      stderr: result.stderr,
    };
  } catch (error) {
    const context = input.errorContext ?? "Git command failed.";
    const stderr =
      typeof error === "object" && error && "stderr" in error
        ? sanitizeGitOutput(String(error.stderr).trim())
        : "";
    const timedOut =
      typeof error === "object" && error && "killed" in error
        ? Boolean(error.killed)
        : false;

    if (timedOut) {
      throw new Error(`${context} The command timed out after ${timeout}ms.`);
    }

    if (stderr.length > 0) {
      throw new Error(`${context} ${stderr}`);
    }

    throw new Error(context);
  }
}
