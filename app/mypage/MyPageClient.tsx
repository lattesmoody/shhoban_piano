'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './page.module.css';

type Session = {
  attendance_num: number;
  in_time: string;
  out_time: string;
  actual_out_time: string | null;
  course_name: string;
  remark: string;
};

type StudentData = {
  student_id: string;
  student_name: string;
  student_grade: number | null;
  member_id: string | null;
  member_name: string | null;
  special_notes: string | null;
  vehicle_yn: boolean | null;
  sessions: Session[];
};

type MemberInfo = {
  member_id: string;
  member_name: string;
  member_code: string;
};

type Props = {
  studentsData: StudentData[];
  members: MemberInfo[];
};

export default function MyPageClient({ studentsData, members }: Props) {
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState('');
  
  // DB에서 가져온 강사 정보로 매핑 생성 (원장, 관리자 제외)
  const memberNamesMap: { [key: string]: string } = {};
  const filteredMembers = members.filter(m => m.member_code !== '99' && m.member_code !== '0');
  
  filteredMembers.forEach(member => {
    memberNamesMap[member.member_id] = member.member_name;
  });
  
  // 강사 ID 목록 (member_id 순서로 정렬, 원장/관리자 제외)
  const memberOrder = filteredMembers
    .sort((a, b) => a.member_id.localeCompare(b.member_id))
    .map(m => m.member_id);
  
  // 현재 시각 표시
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const days = ['일', '월', '화', '수', '목', '금', '토'];
      const dayName = days[now.getDay()];
      const hour24 = now.getHours();
      const hour12 = ((hour24 + 11) % 12) + 1;
      const minute = String(now.getMinutes()).padStart(2, '0');
      const formattedTime = `${now.getFullYear()} - ${String(now.getMonth() + 1).padStart(2, '0')} - ${String(now.getDate()).padStart(2, '0')} (${dayName}) ${hour12}:${minute}`;
      setCurrentTime(formattedTime);
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  
  // 30초마다 자동 새로고침
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      //console.log('🔄 자동 새로고침 (30초)');
      router.refresh();
    }, 30000);
    
    return () => clearInterval(refreshInterval);
  }, [router]);
  
  // 분침을 5분 단위로 정규화하여 표시
  const formatNormalizedMinutes = (timeString: string | null): string => {
    if (!timeString) return '-';
    try {
      const date = new Date(timeString);
      const minute = date.getMinutes();
      
      // 5분 단위로 정규화
      let normalizedMinute;
      if (minute >= 0 && minute <= 2) {
        normalizedMinute = 0;
      } else if (minute >= 3 && minute <= 7) {
        normalizedMinute = 5;
      } else if (minute >= 8 && minute <= 12) {
        normalizedMinute = 10;
      } else if (minute >= 13 && minute <= 17) {
        normalizedMinute = 15;
      } else if (minute >= 18 && minute <= 22) {
        normalizedMinute = 20;
      } else if (minute >= 23 && minute <= 27) {
        normalizedMinute = 25;
      } else if (minute >= 28 && minute <= 32) {
        normalizedMinute = 30;
      } else if (minute >= 33 && minute <= 37) {
        normalizedMinute = 35;
      } else if (minute >= 38 && minute <= 42) {
        normalizedMinute = 40;
      } else if (minute >= 43 && minute <= 47) {
        normalizedMinute = 45;
      } else if (minute >= 48 && minute <= 52) {
        normalizedMinute = 50;
      } else if (minute >= 53 && minute <= 57) {
        normalizedMinute = 55;
      } else if (minute >= 58 && minute <= 59) {
        // 다음 시간 00분으로 간주
        normalizedMinute = 0;
      } else {
        normalizedMinute = 0;
      }
      
      return String(normalizedMinute);
    } catch {
      return '-';
    }
  };
  
  // 시간 포맷 (HH:mm)
  const formatTime = (timeString: string | null): string => {
    if (!timeString) return '-';
    try {
      const date = new Date(timeString);
      const hours = date.getHours();
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${hours}:${minutes}`;
    } catch {
      return '-';
    }
  };
  
  // 학년 표시
  const getGradeName = (grade: number | null): string => {
    if (!grade) return '-';
    switch (Number(grade)) {
      case 1: return '유치부';
      case 2: return '초등부';
      case 3: return '중고등부';
      case 4: return '대회부';
      case 5: return '연주회부';
      case 6: return '신입생';
      case 7: return '기타';
      default: return '-';
    }
  };
  
  // 강사별 아이콘 반환
  const getMemberIcon = (memberId: string): string => {
    switch (memberId) {
      case 'hm01': // 정영롱
        return '■';
      case 'hm02': // 전상은
        return '★';
      case 'hm03': // 강시1
        return '●';
      default:
        return '●';
    }
  };
  
  // 비고에서 방 번호 추출
  const extractRoomNumber = (remark: string | null): string => {
    if (!remark) return '-';
    // 숫자만 추출
    const match = remark.match(/\d+/);
    return match ? match[0] : '-';
  };
  
  // 과정 아이콘
  const getCourseIcon = (courseName: string): string => {
    if (courseName.includes('피아노+이론')) return '●';
    if (courseName.includes('피아노+드럼')) return '◆';
    if (courseName.includes('드럼')) return '■';
    if (courseName.includes('피아노')) return '▲';
    if (courseName.includes('연습만')) return '-';
    return '●';
  };
  
  // 퇴실 시간 계산 (actual_out_time 우선, 없으면 out_time)
  const getExitTime = (session: Session): string => {
    if (session.actual_out_time) {
      return formatTime(session.actual_out_time);
    }
    return formatTime(session.out_time);
  };
  
  // 현재 입실 중인지 확인
  const isCurrentlyInRoom = (session: Session): boolean => {
    return session.actual_out_time === null || session.actual_out_time === undefined;
  };
  
  // 학생의 현재 상태 확인 (입실 중인 세션이 있는지)
  const hasActiveSession = (sessions: Session[]): boolean => {
    return sessions.some(session => isCurrentlyInRoom(session));
  };
  
  // 학생 이름에 * 표시 (입실 중인 경우)
  const getDisplayName = (name: string, isActive: boolean): string => {
    return isActive ? `${name}*` : name;
  };
  
  // 강사별로 그룹화
  const groupByMember = () => {
    const memberGroups: { [key: string]: StudentData[] } = {};
    
    // 모든 강사에 대해 빈 배열 초기화
    memberOrder.forEach(memberId => {
      memberGroups[memberId] = [];
    });
    
    studentsData.forEach(student => {
      const memberId = student.member_id || memberOrder[0]; // 기본값은 첫 번째 강사
      if (memberGroups[memberId]) {
        memberGroups[memberId].push(student);
      } else {
        // 만약 해당 강사가 목록에 없으면 첫 번째 강사에 추가
        if (memberOrder[0]) {
          memberGroups[memberOrder[0]].push(student);
        }
      }
    });
    
    return memberGroups;
  };
  
  const memberGroups = groupByMember();
  
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>관리자 님, 환영합니다 :)</h1>
        </div>
        <nav className={styles.nav}>
          <Link href="/main" className={styles.navLink}>Main</Link>
          <Link href="/setting_manage" className={styles.navLink}>Manage</Link>
          <Link href="/mypage" className={styles.navLinkActive}>MyPage</Link>
          <button onClick={() => router.push('/')} className={styles.navLink}>Logout</button>
        </nav>
      </header>
      
      <main className={styles.main}>
        <div className={styles.timeDisplay}>{currentTime}</div>
        
        <div className={styles.tableContainer}>
          {memberOrder.map((memberId) => {
            const columnData = memberGroups[memberId];
            const memberName = memberNamesMap[memberId] || memberId;
            
            return (
              <div key={memberId} className={styles.column}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>연습<br/>번호</th>
                      <th>이름</th>
                      <th>입실<br/>시간</th>
                      <th>연습<br/>종료</th>
                      <th>원장</th>
                      <th>{memberName}</th>
                      <th>퇴실<br/>시간</th>
                      <th>차량</th>
                      <th>비고</th>
                    </tr>
                  </thead>
                  <tbody>
                    {columnData.map((student) => {
                      const isActive = hasActiveSession(student.sessions);
                      const latestSession = student.sessions[student.sessions.length - 1];
                      
                      return (
                        <tr 
                          key={student.student_id}
                        >
                          <td>{extractRoomNumber(latestSession?.remark)}</td>
                          <td className={styles.nameCell}>
                            {student.student_name}
                          </td>
                          <td>{formatTime(latestSession?.in_time)}</td>
                          <td>{formatNormalizedMinutes(latestSession?.out_time)}</td>
                          <td>●</td>
                          <td>{getMemberIcon(memberId)}</td>
                          <td>{getExitTime(latestSession)}</td>
                          <td className={styles.iconCell}>
                            {student.vehicle_yn ? '탑승' : ''}
                          </td>
                          <td className={styles.remarkCell}>
                            {student.special_notes || '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}

