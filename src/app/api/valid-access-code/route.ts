import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const accessCode = body.accessCode;
  const rawMap = process.env.ACCESS_CODE_MAP;

  if (!rawMap) {
    return NextResponse.json({ error: "Config missing" }, { status: 500 });
  }

  const accessCodeToOrgMap = JSON.parse(rawMap);
  const org = accessCodeToOrgMap[accessCode];

  if (!org) {
    return NextResponse.json({ error: "Invalid access code" }, { status: 401 });
  }

  return NextResponse.json({ org }, { status: 200 });
}