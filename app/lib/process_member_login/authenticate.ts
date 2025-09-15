'use server';
require('dotenv').config({ path: './.env.development.local' }); 

import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcrypt';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { SignJWT } from 'jose';
import { z } from 'zod';
import { selectMemberByLoginId } from '@/app/lib/sql/maps/memberQueries';

const LoginFormSchema = z.object({
  member_id: z.string().min(1, { message: '아이디를 입력해주세요.' }),
  member_pw: z.string().min(1, { message: '비밀번호를 입력해주세요.' }),
});

export async function authenticate(prevState: string | undefined, formData: FormData) {
  try {
    const sql = neon(process.env.DATABASE_URL!);

    const validated = LoginFormSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!validated.success) {
      return validated.error.issues.map((e) => e.message).join(', ');
    }

    const loginId = (validated.data.member_id || '').trim();

    const plainPw = validated.data.member_pw;

    const raw = await selectMemberByLoginId(sql as any, loginId);

    const rows: any[] = Array.isArray(raw) ? raw : (raw && (raw as any).rows && Array.isArray((raw as any).rows) ? (raw as any).rows : []);
    console.error('auth-debug rowsLen=', Array.isArray(rows) ? rows.length : -1, 'row0Keys=', rows[0] ? Object.keys(rows[0]) : []);
    if (!rows || rows.length === 0) return '아이디 또는 비밀번호가 올바르지 않습니다.';
    
    const user = rows[0] as any;
    const storedHash: string | undefined = (user?.member_pw ?? user?.member_PW ?? user?.PASSWORD ?? user?.password_hash) as any;
    console.error('auth-debug hashLen=', String(storedHash || '').length, 'prefix=', String(storedHash || '').slice(0, 7));
    if (!storedHash) return '아이디 또는 비밀번호가 올바르지 않습니다.';

    const ok = await bcrypt.compare(plainPw, String(storedHash));
    console.error('auth-debug compare=', ok);
    if (!ok) return '아이디 또는 비밀번호가 올바르지 않습니다.';

    const secretKey = new TextEncoder().encode(process.env.AUTH_SECRET || 'dev_secret_change_me');
    const token = await new SignJWT({ sub: loginId }).setProtectedHeader({ alg: 'HS256', typ: 'JWT' }).setIssuedAt().setExpirationTime('8h').sign(secretKey);
    const jar = await cookies();
    jar.set('auth_token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 60 * 60 * 8 });
  } catch (error) {
    if (error instanceof Error) {
      console.error('authenticate error:', error.message);
      if (process.env.NODE_ENV !== 'production') return `로그인 오류: ${error.message}`;
    }
    return '로그인 중 오류가 발생했습니다. 다시 시도해 주세요.';
  }
  redirect('/main');
}


