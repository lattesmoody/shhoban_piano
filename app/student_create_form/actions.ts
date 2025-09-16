'use server';

import { neon } from '@neondatabase/serverless';
import { redirect } from 'next/navigation';
import { z } from 'zod';

require('dotenv').config({ path: './.env.development.local' });

const CreateStudentSchema = z.object({
  name: z.string().min(1),
  uniqueId: z.union([z.string(), z.number()]).transform((v) => Number(v)),
  school: z.string().optional().default(''),
  grade: z.union([z.string(), z.number()]).transform((v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }),
  member: z.string().min(1),
  course: z.union([z.string(), z.number()]).transform((v) => Number(v) || 0),
  vehicle: z.any().optional().transform((v) => (v === 'on' || v === true ? true : false)),
});

export async function createStudent(prevState: string | undefined, formData: FormData) {
  const parsed = CreateStudentSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return parsed.error.issues.map((e) => e.message).join(', ');
  }

  const { name, uniqueId, school, grade, member, course, vehicle } = parsed.data;

  const envSql = process.env.INSERT_STUDENT_SQL;
  if (!envSql || envSql.trim().length === 0) {
    return 'INSERT_STUDENT_SQL 환경변수가 설정되지 않았습니다.';
  }

  try {
    const sql = neon(process.env.DATABASE_URL!);
    // students(student_name, student_id, student_school, student_grade, member_id, course_code, vehicle_yn)
    await (sql as any).query(envSql, [
      name,
      String(uniqueId),
      school,
      Number(grade),
      member,
      Number(course),
      Boolean(vehicle),
    ]);
  } catch (e) {
    if (e instanceof Error) {
      // 고유번호(UNIQUE) 중복은 별도 코드로 반환
      if ((e as any).code === '23505' || e.message.includes('students_student_id_key')) {
        return 'DUPLICATE_STUDENT_ID';
      }
      return `학생 생성 오류: ${e.message}`;
    }
    return '학생 생성 중 알 수 없는 오류가 발생했습니다.';
  }

  // 성공은 클라이언트에서 alert 후 이동하도록 토큰 반환
  return `REDIRECT:/student_detail_update_form/${String(uniqueId)}?courseType=${Number(course)}`;
}


