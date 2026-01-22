import { NextResponse } from "next/server";
import { execSync } from "child_process";

function checkClaudeCode(): boolean {
  try {
    execSync("claude --version", { encoding: "utf-8", timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

export async function GET() {
  const hasClaudeCode = checkClaudeCode();

  return NextResponse.json({
    hasApiKey: hasClaudeCode, // Keep same field name for compatibility
    hasClaudeCode,
    mode: hasClaudeCode ? "claude-code" : "command"
  });
}
