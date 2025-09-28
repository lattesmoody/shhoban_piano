'use server';

import { neon } from '@neondatabase/serverless';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

// 학생 기본 정보 업데이트: 학교, 학년, 담당강사, 과정, 차량탑승, 특이사항
export async function updateStudent(formData: FormData) {
  const studentId = String(formData.get('uniqueId') || formData.get('studentId') || '').trim();
  const school = String(formData.get('schoolName') || '').trim();
  const gradeRaw = String(formData.get('grade') || '').trim();
  const memberId = String(formData.get('instructor') || '').trim();
  const courseRaw = String(formData.get('courseType') || '').trim();
  const vehicle = String(formData.get('useVehicle') || '').trim() === 'O';
  const notes = String(formData.get('notes') || '').trim();

  const grade = Number(gradeRaw.replace(/[^0-9]/g, '')) || 0;
  const course = Number(courseRaw.replace(/[^0-9]/g, '')) || 0;

  if (!studentId) return;

  const sql = neon(process.env.DATABASE_URL!);

  // SQL은 환경변수에서만 로드 (노출 방지)
  const envSql = (process.env.UPDATE_STUDENT_BY_ID_SQL || '').trim();
  if (!envSql) throw new Error('UPDATE_STUDENT_BY_ID_SQL 환경변수가 설정되지 않았습니다.');

  await (sql as any).query(envSql, [studentId, school, grade, memberId, course, vehicle, notes]);

  revalidatePath('/student_manage');
  redirect('/student_manage');
}


