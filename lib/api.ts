import { NextResponse } from "next/server";

export function okJson(data: unknown, init?: ResponseInit) {
  return NextResponse.json(
    {
      ok: true,
      data
    },
    init
  );
}

export function errorJson(message: string, status = 400, detail?: unknown) {
  return NextResponse.json(
    {
      ok: false,
      error: message,
      detail
    },
    { status }
  );
}

