// 학생 관련 DB 쿼리 매핑 레이어
require('dotenv').config({ path: './.env.development.local' }); 

import { Student } from '@/app/lib/data';

// 활성화된 학생 목록을 조회하는 함수
export async function selectActiveStudents(sql: any): Promise<Student[]> {
  const envSql = process.env.SELECT_ACTIVE_STUDENTS_SQL;
  if (envSql && envSql.trim().length > 0) {
    const result = await (sql as any).query(envSql);
    const rows: any[] = Array.isArray(result) ? result : (result && (result as any).rows && Array.isArray((result as any).rows) ? (result as any).rows : []);
    
    // DB 결과를 Student 타입으로 변환
    return rows.map((row: any) => ({
      student_num: row.student_num,
      student_name: row.student_name,
      student_id: row.student_id,
      student_school: row.student_school || '',
      student_grade: row.student_grade || 0,
      member_id: row.member_id || '',
      member_name: row.member_name || row.member_id || '',
      course_code: row.course_code || 0,
      vehicle_yn: row.vehicle_yn || false,
      special_notes: row.special_notes || '',
      is_active: row.is_active || false,
      created_time: row.created_time || ''
    }));
  }
  throw new Error('SELECT_ACTIVE_STUDENTS_SQL 환경변수가 설정되지 않았습니다. 운영/개발 환경변수에 SQL을 등록해 주세요.');
}

