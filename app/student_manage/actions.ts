'use server';

import { revalidatePath } from 'next/cache';
import { neon } from '@neondatabase/serverless';
import { deleteStudentById } from '@/app/lib/sql/maps/studentQueries';

export async function deleteStudent(formData: FormData) {
  const studentId = String(formData.get('studentId') || '').trim();
  if (!studentId) {
    return { ok: false, message: '학생 고유번호가 비어 있습니다.' };
  }
  try {
    const sql = neon(process.env.DATABASE_URL!);
    await deleteStudentById(sql, studentId);
    revalidatePath('/student_manage');
    return { ok: true };
  } catch (err: any) {
    console.error('deleteStudent error:', err?.message || err);
    return { ok: false, message: '삭제 중 오류가 발생했습니다.' };
  }
}


