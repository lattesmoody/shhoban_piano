import { NextRequest, NextResponse } from 'next/server';
import { processEntrance } from '@/app/main/actions';

export async function POST(req: NextRequest) {
  try {
    const { studentId } = await req.json();
    const msg = await processEntrance(String(studentId || ''));
    return new NextResponse(msg || '');
  } catch (e: any) {
    return new NextResponse('오류가 발생했습니다.', { status: 500 });
  }
}


