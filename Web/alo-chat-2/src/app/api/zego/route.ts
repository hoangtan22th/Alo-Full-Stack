import { NextResponse } from "next/server";

export async function GET() {
  const appID = process.env.NEXT_PUBLIC_ZEGO_APP_ID;
  const serverSecret = process.env.NEXT_PUBLIC_ZEGO_SERVER_SECRET;

  if (!appID || !serverSecret) {
    return NextResponse.json(
      { error: "Server missing ZEGO configuration in .env" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    appID: Number(appID),
    serverSecret,
  });
}
