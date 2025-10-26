// 서버 컴포넌트: 연습실 관리 DB에서 조회 후 클라이언트 렌더
import { neon } from '@neondatabase/serverless';
import { selectPracticeStatusToday, PracticeRow } from '@/app/lib/sql/maps/practiceRoomQueries';
import { selectKinderStatus, KinderRow } from '@/app/lib/sql/maps/kinderRoomQueries';
import { selectDrumStatus, DrumRow } from '@/app/lib/sql/maps/drumRoomQueries';
import { selectClassTimeSettings, ClassTimeSetting } from '@/app/lib/sql/maps/classTimeQueries';
import { normalizePlaceholderForEnv } from '@/app/lib/sql/utils';
import MainClient from './MainClient';

export type StudentCourseInfo = {
  student_id: string;
  student_grade: number | null;
  lesson_code: number;
  grade_name: string;
};

export default async function AdminPage() {
  const sql = neon(process.env.DATABASE_URL!);
  const rows: PracticeRow[] = await selectPracticeStatusToday(sql);
  const kinderRows: KinderRow[] = await selectKinderStatus(sql);
  const drumRows: DrumRow[] = await selectDrumStatus(sql);
  const classTimeSettings: ClassTimeSetting[] = await selectClassTimeSettings(sql);

  // 현재 입실한 학생들의 과정 정보 조회
  const allStudentIds = [
    ...rows.filter(r => r.student_id).map(r => r.student_id!),
    ...kinderRows.filter(r => r.student_id).map(r => r.student_id!),
    ...drumRows.filter(r => r.student_id).map(r => r.student_id!)
  ];

  const studentCourseInfos: StudentCourseInfo[] = [];
  
  if (allStudentIds.length > 0) {
    const today = new Date();
    const dayCode = ((today.getDay() + 6) % 7) + 1; // 월=1..일=7
    
    // 학생별 오늘의 과정 정보 조회
    for (const studentId of allStudentIds) {
      try {
        // 학생 기본 정보 조회
        const studentSql = normalizePlaceholderForEnv(process.env.SELECT_STUDENT_BY_ID_SQL);
        if (studentSql) {
          const studentRes: any = await (sql as any).query(studentSql, [studentId]);
          const student = Array.isArray(studentRes) ? studentRes[0] : (studentRes?.rows?.[0] ?? null);
          
          if (student) {
            // 오늘의 과정 조회
            const courseSql = normalizePlaceholderForEnv(process.env.SELECT_STUDENT_COURSE_BY_DAY_SQL);
            if (courseSql) {
              const courseRes: any = await (sql as any).query(courseSql, [studentId, dayCode]);
              const course = Array.isArray(courseRes) ? courseRes[0] : (courseRes?.rows?.[0] ?? null);
              
              if (course) {
                // 학년에 따른 grade_name 매핑
                let gradeName = '초등부'; // 기본값
                if (student.student_grade) {
                  if (student.student_grade <= 6) {
                    gradeName = '유치부';
                  } else if (student.student_grade <= 12) {
                    gradeName = '초등부';
                  } else if (student.student_grade <= 18) {
                    gradeName = '중고등부';
                  } else {
                    gradeName = '대회부';
                  }
                }
                
                studentCourseInfos.push({
                  student_id: studentId,
                  student_grade: student.student_grade,
                  lesson_code: course.lesson_code,
                  grade_name: gradeName
                });
              }
            }
          }
        }
      } catch (error) {
        console.error(`Error fetching course info for student ${studentId}:`, error);
      }
    }
  }

  return <MainClient 
    rows={rows} 
    kinderRows={kinderRows} 
    drumRows={drumRows} 
    classTimeSettings={classTimeSettings}
    studentCourseInfos={studentCourseInfos}
  />;
}
