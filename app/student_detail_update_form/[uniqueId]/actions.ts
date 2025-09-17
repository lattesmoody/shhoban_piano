'use server';

import { neon } from '@neondatabase/serverless';
import { deleteStudentCourses, insertStudentCourse, dayToCode, lessonToCode, selectStudentCourses, codeToDay, codeToLesson } from '@/app/lib/sql/maps/studentCourseQueries';
import { redirect } from 'next/navigation';

export async function updateStudentCourses(formData: FormData): Promise<void> {
  const studentId = String(formData.get('studentId') || '');
  const count = Number(formData.get('count') || 0);
  if (!studentId || count <= 0) {
    // 단순 무시하고 돌아감(폼 오류)
    redirect('/student_manage');
    return;
  }

  const sql = neon(process.env.DATABASE_URL!);
  try {
    await deleteStudentCourses(sql, studentId);
    for (let i = 0; i < count; i++) {
      const day = String(formData.get(`day_${i}`) || '');
      const lesson = String(formData.get(`lesson_${i}`) || '');
      // course_code: 각 슬롯 번호(1..N)
      const courseIndex = i + 1;
      await insertStudentCourse(sql, studentId, courseIndex, dayToCode(day), lessonToCode(lesson));
    }
  } catch (e) {
    throw e;
  }
  redirect('/student_manage');
}

export async function loadStudentCourses(studentId: string): Promise<{ courseIndex: number; day: string; lesson: string; }[]> {
  const sql = neon(process.env.DATABASE_URL!);
  const result = await selectStudentCourses(sql, studentId);
  const rows: any[] = Array.isArray(result?.rows) ? result.rows : (Array.isArray(result) ? result : []);
  return rows.map((r: any) => ({
    courseIndex: Number(r.course_code),
    day: codeToDay(Number(r.day_code)),
    lesson: codeToLesson(Number(r.lesson_code)),
  })).sort((a, b) => a.courseIndex - b.courseIndex);
}


