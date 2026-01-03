import { NextRequest, NextResponse } from "next/server";
import { existsSync, readFileSync } from "fs";
import { Mail } from "@/types/gastown";

const GASTOWN_PATH = process.env.GASTOWN_PATH || "~/gt";

function expandPath(path: string): string {
  if (path.startsWith("~/")) {
    return path.replace("~", process.env.HOME || "");
  }
  return path;
}

function getMailFilePath(agent?: string): string {
  const basePath = expandPath(GASTOWN_PATH);
  if (agent) {
    return `${basePath}/.mail/${agent}.jsonl`;
  }
  return `${basePath}/.mail/announces.jsonl`;
}

function parseMailFile(filePath: string): Mail[] {
  if (!existsSync(filePath)) {
    return [];
  }

  try {
    const content = readFileSync(filePath, "utf-8");
    const lines = content.trim().split("\n").filter(Boolean);

    return lines.map((line) => {
      try {
        return JSON.parse(line) as Mail;
      } catch {
        return null;
      }
    }).filter((mail): mail is Mail => mail !== null);
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const agent = searchParams.get("agent");
  const announces = searchParams.get("announces") === "true";

  try {
    if (announces) {
      const filePath = getMailFilePath();
      const messages = parseMailFile(filePath);
      return NextResponse.json({ messages, available: existsSync(expandPath(`${GASTOWN_PATH}/.mail`)) });
    }

    if (agent) {
      const filePath = getMailFilePath(agent);
      const messages = parseMailFile(filePath);
      return NextResponse.json({ messages, available: existsSync(expandPath(`${GASTOWN_PATH}/.mail`)) });
    }

    return NextResponse.json(
      { error: "agent parameter or announces=true is required" },
      { status: 400 }
    );
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
