// 서버 컴포넌트: 연습실 관리 DB에서 조회 후 클라이언트 렌더
import { neon } from '@neondatabase/serverless';
import { selectPracticeStatusToday, PracticeRow } from '@/app/lib/sql/maps/practiceRoomQueries';
import { selectKinderStatus, KinderRow } from '@/app/lib/sql/maps/kinderRoomQueries';
import { selectDrumStatus, DrumRow } from '@/app/lib/sql/maps/drumRoomQueries';
import { selectClassTimeSettings, ClassTimeSetting } from '@/app/lib/sql/maps/classTimeQueries';
import { selectWaitingQueue, WaitingQueueRow } from '@/app/lib/sql/maps/waitingQueueQueries';
import { normalizePlaceholderForEnv } from '@/app/lib/sql/utils';
import MainClient from './MainClient';

export type StudentCourseInfo = {
  student_id: string;
  student_grade: number | null;
  lesson_code: number;
  grade_name: string;
  member_id?: string;
  member_name?: string;
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
                // 학년 코드에 따른 grade_name 매핑
                let gradeName = '초등부'; // 기본값
                if (student.student_grade) {
                  switch (student.student_grade) {
                    case 1: gradeName = '유치부'; break;
                    case 2: gradeName = '초등부'; break;
                    case 3: gradeName = '중고등부'; break;
                    case 4: gradeName = '대회부'; break;
                    case 5: gradeName = '연주회부'; break;
                    case 6: gradeName = '신입생'; break;
                    case 7: gradeName = '기타'; break;
                    default: gradeName = '초등부'; break;
                  }
                }
                
                // 담당 강사 정보 조회
                let memberName = '강사';
                let memberId = '1';
                if (student.member_id) {
                  try {
                    const memberSql = normalizePlaceholderForEnv(process.env.SELECT_MEMBER_BY_ID_SQL);
                    if (memberSql) {
                      const memberRes: any = await (sql as any).query(memberSql, [student.member_id]);
                      const member = Array.isArray(memberRes) ? memberRes[0] : (memberRes?.rows?.[0] ?? null);
                      if (member) {
                        memberName = member.member_name || '강사';
                        memberId = String(member.member_code || student.member_id);
                      }
                    } else {
                      console.warn('SELECT_MEMBER_BY_ID_SQL 환경변수가 설정되지 않았습니다.');
                    }
                  } catch (error) {
                    console.error(`Error fetching member info for ${student.member_id}:`, error);
                  }
                }

                studentCourseInfos.push({
                  student_id: studentId,
                  student_grade: student.student_grade,
                  lesson_code: course.lesson_code,
                  grade_name: gradeName,
                  member_id: memberId,
                  member_name: memberName
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

  // 대기열 데이터 조회
  let pianoWaitingQueue: WaitingQueueRow[] = [];
  let kinderWaitingQueue: WaitingQueueRow[] = [];
  
  try {
    pianoWaitingQueue = await selectWaitingQueue(sql, 'piano');
  } catch (error) {
    console.warn('Piano waiting queue data not available:', error);
  }
  
  try {
    kinderWaitingQueue = await selectWaitingQueue(sql, 'kinder');
  } catch (error) {
    console.warn('Kinder waiting queue data not available:', error);
  }

  return <MainClient 
    rows={rows} 
    kinderRows={kinderRows} 
    drumRows={drumRows} 
    classTimeSettings={classTimeSettings}
    studentCourseInfos={studentCourseInfos}
    pianoWaitingQueue={pianoWaitingQueue}
    kinderWaitingQueue={kinderWaitingQueue}
  />;
}
