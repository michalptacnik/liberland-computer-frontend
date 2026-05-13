import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { proxyLiberlandRequest, UpstreamError } from "@/lib/bff/upstream";

type Params = { params: Promise<{ path: string[] }> };

async function handler(request: NextRequest, context: Params) {
  try {
    const { path } = await context.params;
    return proxyLiberlandRequest(request, path);
  } catch (error) {
    if (error instanceof UpstreamError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status },
      );
    }
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "BFF request failed" },
      { status: 500 },
    );
  }
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;

