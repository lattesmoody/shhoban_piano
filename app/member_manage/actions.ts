'use server';

import { revalidatePath } from 'next/cache';
import { neon } from '@neondatabase/serverless';
import { deleteMemberByLoginId } from '@/app/lib/sql/maps/memberQueries';

export async function deleteMember(formData: FormData) {
  const loginId = String(formData.get('loginId') || '').trim();
  if (!loginId) {
    return { ok: false, message: '아이디가 비어 있습니다.' };
  }
  try {
    const sql = neon(process.env.DATABASE_URL!);
    await deleteMemberByLoginId(sql, loginId);
    revalidatePath('/member_manage');
    return { ok: true };
  } catch (err: any) {
    console.error('deleteMember error:', err?.message || err);
    return { ok: false, message: '삭제 중 오류가 발생했습니다.' };
  }
}


