import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { neon } from '@neondatabase/serverless';
import MyPageClient from './MyPageClient';
import dotenv from 'dotenv';

dotenv.config({ path: './.env.development.local' });

// 환경변수에서 SQL 쿼리 가져오기
function normalizePlaceholder(raw: string | undefined): string {
  const input = (raw || '').trim();
  if (!input) return '';
  let normalized = input.replace(/\\\$/g, '$');
  normalized = normalized.replace(/`(\$\d+)/g, '$1');
  normalized = normalized.replace(/\\"/g, '"');
  return normalized;
}

async function getMyPageData() {
  const sql = neon(process.env.DATABASE_URL!);
  
  try {
    // 오늘 날짜
    const today = new Date().toISOString().slice(0, 10);
    
    // 오늘의 모든 출석 기록 조회
    const attendanceSql = normalizePlaceholder(process.env.SELECT_ATTENDANCE_BY_DATE_SQL);
    if (!attendanceSql) {
      throw new Error('SELECT_ATTENDANCE_BY_DATE_SQL 환경변수가 설정되지 않았습니다.');
    }
    
    const attendanceResult: any = await sql.query(attendanceSql, [today]);
    const allAttendance = Array.isArray(attendanceResult) ? attendanceResult : (attendanceResult?.rows || []);
    
    // 학생 정보 조회 (학년 정보 포함)
    const studentsSql = normalizePlaceholder(process.env.SELECT_ALL_STUDENTS_SQL);
    if (!studentsSql) {
      throw new Error('SELECT_ALL_STUDENTS_SQL 환경변수가 설정되지 않았습니다.');
    }
    
    const studentsResult: any = await sql.query(studentsSql);
    const allStudents = Array.isArray(studentsResult) ? studentsResult : (studentsResult?.rows || []);
    
    // 출석 기록에 학생 정보 병합
    const enrichedAttendance = allAttendance.map((record: any) => {
      const student = allStudents.find((s: any) => s.student_id === record.student_id);
      return {
        ...record,
        student_grade: student?.student_grade || null
      };
    });
    
    // 학생별로 그룹화
    const studentMap = new Map();
    
    enrichedAttendance.forEach((record: any) => {
      const studentId = record.student_id;
      
      if (!studentMap.has(studentId)) {
        studentMap.set(studentId, {
          student_id: studentId,
          student_name: record.student_name,
          student_grade: record.student_grade,
          sessions: []
        });
      }
      
      studentMap.get(studentId).sessions.push({
        attendance_num: record.attendance_num,
        in_time: record.in_time,
        out_time: record.out_time,
        actual_out_time: record.actual_out_time,
        course_name: record.course_name,
        remark: record.remark
      });
    });
    
    // 배열로 변환하고 정렬
    const studentsData = Array.from(studentMap.values()).sort((a, b) => {
      // 입실 시간 기준 정렬 (가장 최근 입실 시간)
      const aLatestIn = a.sessions.reduce((latest: string | null, session: any) => {
        if (!latest) return session.in_time;
        return session.in_time > latest ? session.in_time : latest;
      }, null);
      
      const bLatestIn = b.sessions.reduce((latest: string | null, session: any) => {
        if (!latest) return session.in_time;
        return session.in_time > latest ? session.in_time : latest;
      }, null);
      
      if (!aLatestIn) return 1;
      if (!bLatestIn) return -1;
      
      // Date 객체나 문자열을 모두 처리
      const aTime = new Date(aLatestIn).getTime();
      const bTime = new Date(bLatestIn).getTime();
      return aTime - bTime;
    });
    
    return studentsData;
    
  } catch (error) {
    console.error('MyPage 데이터 조회 오류:', error);
    return [];
  }
}

export default async function MyPage() {
  const jar = await cookies();
  const token = jar.get('auth_token');
  
  if (!token) {
    redirect('/member_login');
  }
  
  const studentsData = await getMyPageData();
  
  return <MyPageClient studentsData={studentsData} />;
}

