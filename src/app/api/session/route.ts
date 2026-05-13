import { NextResponse, type NextRequest } from "next/server";
import { publicSession, readSession } from "@/lib/bff/session";

export async function GET(request: NextRequest) {
  return NextResponse.json(publicSession(readSession(request)));
}

