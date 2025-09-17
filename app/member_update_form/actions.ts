'use server';

import { revalidatePath } from 'next/cache';
import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcrypt';

type UpdateResult = { ok: boolean; message?: string };

export async function updateMember(prevState: UpdateResult | undefined, formData: FormData): Promise<UpdateResult> {
  const memberId = String(formData.get('memberId') || '').trim();
  const memberName = String(formData.get('memberName') || '').trim();
  const roleCodeRaw = String(formData.get('roleCode') || '').trim();
  const newPassword = String(formData.get('newPassword') || '').trim();

  if (!memberId) return { ok: false, message: '아이디가 비어 있습니다.' };
  if (!memberName) return { ok: false, message: '이름을 입력해주세요.' };
  const roleCode = Number(roleCodeRaw);
  if (!Number.isFinite(roleCode)) return { ok: false, message: '강사구분이 올바르지 않습니다.' };

  try {
    const sql = neon(process.env.DATABASE_URL!);

    const profileSql = (process.env.UPDATE_MEMBER_PROFILE_SQL || '').trim();
    if (!profileSql) return { ok: false, message: 'UPDATE_MEMBER_PROFILE_SQL이 설정되어 있지 않습니다.' };
    await (sql as any).query(profileSql, [memberId, memberName, roleCode]);

    if (newPassword.length > 0) {
      const passwordSql = (process.env.UPDATE_MEMBER_PASSWORD_SQL || '').trim();
      if (!passwordSql) return { ok: false, message: 'UPDATE_MEMBER_PASSWORD_SQL이 설정되어 있지 않습니다.' };
      const hash = await bcrypt.hash(newPassword, 10);
      await (sql as any).query(passwordSql, [memberId, hash]);
    }

    revalidatePath('/member_manage');
    return { ok: true };
  } catch (err: any) {
    console.error('updateMember error:', err?.message || err);
    return { ok: false, message: '수정 중 오류가 발생했습니다.' };
  }
}


