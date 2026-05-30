import { AccessToken } from 'livekit-server-sdk';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const room = searchParams.get('room');
  const username = searchParams.get('username'); // identity (unique: userId)
  const displayName = searchParams.get('displayName') || username; // tên hiển thị

  if (!room || !username) {
    return NextResponse.json({ error: 'Missing room or username' }, { status: 400 });
  }

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!apiKey || !apiSecret) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const at = new AccessToken(apiKey, apiSecret, {
    identity: username,   // identity phải unique trong room
    name: displayName || username,  // tên hiển thị cho participant
    ttl: '4h',  // token hết hạn sau 4 tiếng
  });

  at.addGrant({ 
    roomJoin: true, 
    room: room,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  const token = await at.toJwt();
  console.log(`[LiveKit] Token created for identity=${username}, displayName=${displayName}, room=${room}`);
  
  return NextResponse.json({ token });
}
