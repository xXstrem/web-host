import { NextResponse } from 'next/server';
import { isSetupComplete } from '@/lib/auth-server';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({ completed: isSetupComplete() });
}
