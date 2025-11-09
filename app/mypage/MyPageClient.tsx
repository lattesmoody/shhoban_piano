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
  sessions: Session[];
};

type Props = {
  studentsData: StudentData[];
};

export default function MyPageClient({ studentsData }: Props) {
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState('');
  
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
      console.log('🔄 자동 새로고침 (30초)');
      router.refresh();
    }, 30000);
    
    return () => clearInterval(refreshInterval);
  }, [router]);
  
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
  
  // 테이블을 3개 컬럼으로 나누기
  const itemsPerColumn = Math.ceil(studentsData.length / 3);
  const columns = [
    studentsData.slice(0, itemsPerColumn),
    studentsData.slice(itemsPerColumn, itemsPerColumn * 2),
    studentsData.slice(itemsPerColumn * 2)
  ];
  
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
          {columns.map((columnData, colIndex) => (
            <div key={colIndex} className={styles.column}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>연습<br/>번호</th>
                    <th>이름</th>
                    <th>입실<br/>시간</th>
                    <th>연습<br/>종료</th>
                    <th>원장</th>
                    <th>강사</th>
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
                        className={isActive ? styles.activeRow : ''}
                      >
                        <td>{student.student_id}</td>
                        <td className={styles.nameCell}>
                          {getDisplayName(student.student_name, isActive)}
                        </td>
                        <td>{formatTime(latestSession?.in_time)}</td>
                        <td>{getExitTime(latestSession)}</td>
                        <td>원장</td>
                        <td>강사</td>
                        <td>{getExitTime(latestSession)}</td>
                        <td className={styles.iconCell}>
                          {student.sessions.some(s => s.remark?.includes('차')) && '🚗'}
                        </td>
                        <td className={styles.remarkCell}>
                          {latestSession?.remark || ''}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

