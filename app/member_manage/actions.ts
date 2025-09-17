'use server';

import { revalidatePath } from 'next/cache';
import { neon } from '@neondatabase/serverless';
import { deleteMemberByLoginId, selectMemberRoleCode } from '@/app/lib/sql/maps/memberQueries';

export async function deleteMember(formData: FormData) {
  const loginId = String(formData.get('loginId') || '').trim();
  if (!loginId) {
    return { ok: false, message: '아이디가 비어 있습니다.' };
  }
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const roleCode = await selectMemberRoleCode(sql, loginId);
    if (roleCode === 99) {
      return { ok: false, message: '관리자 계정은 삭제할 수 없습니다.' };
    }
    await deleteMemberByLoginId(sql, loginId);
    revalidatePath('/member_manage');
    return { ok: true };
  } catch (err: any) {
    console.error('deleteMember error:', err?.message || err);
    return { ok: false, message: '삭제 중 오류가 발생했습니다.' };
  }
}


