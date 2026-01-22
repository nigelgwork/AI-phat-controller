import { NextRequest, NextResponse } from "next/server";
import { execFile, spawn } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

function getEnvPaths() {
  const home = process.env.HOME || "/root";
  const gastownPath = process.env.GASTOWN_PATH || `${home}/gt`;
  const goBinPath = `${home}/go/bin`;
  return { home, gastownPath, goBinPath };
}

// System prompt for Claude Code to understand the Gas Town context
function getSystemPrompt(gastownPath: string) {
  return `You are the AI Controller for Gas Town, a multi-agent orchestration system. You have access to the Gas Town workspace at ${gastownPath}. Available CLI tools: gt (Gas Town CLI for managing rigs, convoys, agents) and bd (Beads CLI for managing work items). Common commands: gt rig list, gt convoy list, bd list, bd ready. Help the user manage their multi-agent coding workflow. Be concise and helpful.`;
}

async function runClaudeCode(message: string): Promise<string> {
  const { gastownPath, goBinPath } = getEnvPaths();

  const env = {
    ...process.env,
    PATH: `${goBinPath}:/usr/local/go/bin:/usr/local/bin:/usr/bin:/bin:${process.env.PATH || ""}`,
    GASTOWN_PATH: gastownPath,
  };

  // Use spawn with stdin ignored to prevent Claude from waiting for input
  return new Promise((resolve, reject) => {
    const child = spawn("/usr/bin/claude", [
      "--print",
      "--output-format", "text",
      "--no-session-persistence",
      "--system-prompt", getSystemPrompt(gastownPath),
      message
    ], {
      env,
      cwd: gastownPath,
      stdio: ["ignore", "pipe", "pipe"], // Critical: ignore stdin
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => { stdout += data; });
    child.stderr.on("data", (data) => { stderr += data; });

    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error("Claude Code timed out after 120 seconds"));
    }, 120000);

    child.on("close", (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        resolve(stdout.trim() || stderr.trim() || "Command completed.");
      } else if (stdout.trim()) {
        // Return output even on non-zero exit
        resolve(stdout.trim());
      } else {
        reject(new Error(stderr.trim() || `Claude Code exited with code ${code}`));
      }
    });

    child.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

// Run gt/bd commands directly
async function runDirectCommand(command: string): Promise<string> {
  const { gastownPath, goBinPath } = getEnvPaths();

  const env = {
    ...process.env,
    PATH: `${goBinPath}:/usr/local/go/bin:/usr/local/bin:/usr/bin:/bin:${process.env.PATH || ""}`,
    GASTOWN_PATH: gastownPath,
  };

  // Split command into parts
  const parts = command.trim().split(/\s+/);
  const cmd = parts[0];
  const args = parts.slice(1);

  try {
    const { stdout, stderr } = await execFileAsync(cmd, args, {
      env,
      cwd: gastownPath,
      timeout: 30000,
      maxBuffer: 10 * 1024 * 1024,
    });

    return stdout.trim() || stderr.trim() || "(No output)";
  } catch (error: unknown) {
    const err = error as { stdout?: string; stderr?: string; message?: string };
    if (err.stdout?.trim()) {
      return err.stdout.trim();
    }
    if (err.stderr?.trim()) {
      return err.stderr.trim();
    }
    throw new Error(err.message || "Command failed");
  }
}

// Check if message is a direct command
function isDirectCommand(message: string): string | null {
  const msg = message.trim();
  if (msg.startsWith("gt ") || msg.startsWith("bd ")) {
    return msg;
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, useClaudeCode = true } = body;

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // Check for direct commands (bypass Claude Code for efficiency)
    const directCmd = isDirectCommand(message);
    if (directCmd) {
      try {
        const output = await runDirectCommand(directCmd);
        return NextResponse.json({ response: output });
      } catch (error) {
        return NextResponse.json({
          response: `Error: ${error instanceof Error ? error.message : "Command failed"}`,
        });
      }
    }

    // Use Claude Code for natural language requests
    if (useClaudeCode) {
      try {
        const response = await runClaudeCode(message);
        return NextResponse.json({ response });
      } catch (error) {
        return NextResponse.json({
          response: `Claude Code error: ${error instanceof Error ? error.message : "Unknown error"}

You can still run commands directly:
• gt rig list - List repositories
• gt convoy list - List convoys
• bd list - List work items`,
        });
      }
    }

    return NextResponse.json({
      response: `Try running a command directly:
• gt rig list - List repositories
• gt convoy list - List convoys
• bd list - List work items`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Request failed" },
      { status: 500 }
    );
  }
}
