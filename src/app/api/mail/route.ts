import { NextRequest, NextResponse } from "next/server";
import { execSync } from "child_process";
import { join } from "path";
import { Mail } from "@/types/gastown";

const GASTOWN_PATH = process.env.GASTOWN_PATH || "~/gt";
const BIN_DIR = join(process.cwd(), "bin");

function expandPath(path: string): string {
  if (path.startsWith("~/")) {
    return path.replace("~", process.env.HOME || "");
  }
  return path;
}

interface RawMail {
  id: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  timestamp: string;
  read: boolean;
  priority?: string;
  type?: string;
  thread_id?: string;
}

function fetchMailViaGt(identity?: string): Mail[] {
  try {
    const gastownPath = expandPath(GASTOWN_PATH);
    const cmd = identity
      ? `gt mail inbox --identity "${identity}" --json`
      : `gt mail inbox --json`;

    const result = execSync(cmd, {
      encoding: "utf-8",
      timeout: 5000,
      cwd: gastownPath,
      env: {
        ...process.env,
        PATH: `${BIN_DIR}:${process.env.PATH}`,
        GASTOWN_PATH: gastownPath,
      },
    }).trim();

    if (!result || result === "null") {
      return [];
    }

    const rawMessages = JSON.parse(result) as RawMail[];
    return rawMessages.map((m) => ({
      id: m.id,
      from: m.from,
      to: m.to,
      subject: m.subject,
      body: m.body,
      sent_at: m.timestamp,
      read: m.read,
      thread_id: m.thread_id,
    }));
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const agent = searchParams.get("agent");
  const rig = searchParams.get("rig");

  try {
    // Build identity from agent and rig
    let identity: string | undefined;
    if (agent) {
      // If agent already contains rig (e.g., "gastownui/refinery"), use as-is
      if (agent.includes("/")) {
        identity = agent;
      } else if (rig) {
        identity = `${rig}/${agent}`;
      } else {
        identity = agent;
      }
    }

    const messages = fetchMailViaGt(identity);
    return NextResponse.json({ messages, available: true });
  } catch (error) {
    console.error("Failed to fetch mail:", error);
    return NextResponse.json({ messages: [], available: false });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, subject, body: messageBody } = body;

    if (!to || !subject || !messageBody) {
      return NextResponse.json(
        { error: "to, subject, and body are required" },
        { status: 400 }
      );
    }

    const success = sendMail(to, subject, messageBody);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to send mail" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("Failed to send mail:", error);
    return NextResponse.json(
      { error: "Failed to send mail" },
      { status: 500 }
    );
  }
}
