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
  exit_minute_status: number;  // 1, 2, 3
  director_status: number;      // 1, 2, 3
  theory_status: number;        // 1, 2, 3
  teacher_status: number;       // 1, 2, 3
  vehicle_status: number;       // 1=탑승 대기, 2=탑승 완료
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
  
  // 비고 팝업 상태
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [popupContent, setPopupContent] = useState('');

  // 비고 팝업 열기
  const openPopup = (content: string | null) => {
    if (!content || content === '-') return;
    setPopupContent(content);
    setIsPopupOpen(true);
  };

  // 비고 팝업 닫기
  const closePopup = () => {
    setIsPopupOpen(false);
    setPopupContent('');
  };
  
  // 드럼 상태 업데이트 핸들러
  const handleDrumStatusClick = async (
    attendance_num: number,
    field: 'exit_minute' | 'director' | 'theory' | 'teacher' | 'vehicle',
    current_status: number,
    course_name: string
  ) => {
    try {
      const response = await fetch('/api/update-drum-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          attendance_num,
          field,
          current_status,
          course_name,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // 페이지 새로고침
        router.refresh();
      } else {
        console.error('상태 업데이트 실패:', data.error);
      }
    } catch (error) {
      console.error('상태 업데이트 오류:', error);
    }
  };
  
  // 상태에 따른 아이콘 반환 (피아노+드럼 5단계 지원)
  const getStatusIcon = (status: number, memberId: string, type: 'director' | 'teacher' | 'theory'): string => {
    if (status === 1) return '-';
    
    if (type === 'director' || type === 'theory') {
      // 원장/이론 컬럼: ○ → ● → ○ → ●
      if (status === 2 || status === 4) return '○';
      return '●'; // status 3 or 5
    }
    
    // 강사 컬럼: 강사별로 다른 아이콘
    if (status === 2 || status === 4) {
      // 빈 아이콘
      switch (memberId) {
        case 'hm01': return '□'; // 정영롱
        case 'hm02': return '☆'; // 전상은
        case 'hm03': return '○'; // 강사1
        default: return '□';
      }
    }
    
    // status === 3 or 5 - 찬 아이콘
    return getMemberIcon(memberId);
  };
  
  // 상태에 따른 색상 클래스 반환 (피아노+드럼용)
  const getStatusColorClass = (status: number, courseName: string, remark: string | null): string => {
    const isPianoDrum = courseName && (
      courseName.includes('피아노') && courseName.includes('드럼')
    );
    
    if (!isPianoDrum) {
      // 드럼만 있는 경우 빨간색
      return courseName?.includes('드럼') ? styles.drumClickable : '';
    }
    
    // 피아노+드럼: 
    // 드럼실에 있으면 파란색, 그 외(피아노 연습실)는 검은색
    if (remark && remark.includes('드럼')) {
      return styles.pianoDrumBlue; // 파란색 - 드럼실
    } else {
      return styles.pianoDrumBlack; // 검은색 - 피아노실
    }
  };
  
  // 차량 상태 아이콘 반환 (SVG)
  const getVehicleIcon = (status: number): React.ReactNode => {
    // 1=탑승 대기(노란색), 2=탑승 완료(회색)
    const fillColor = status === 1 ? '#FFD700' : status === 2 ? '#808080' : '#CCCCCC';
    
    return (
      <svg className={styles.vehicleIcon} viewBox="0 0 24 24" fill={fillColor} xmlns="http://www.w3.org/2000/svg">
        <path d="M18 11V6C18 4.34 16.66 3 15 3H9C7.34 3 6 4.34 6 6V11H5C4.45 11 4 11.45 4 12V15C4 15.55 4.45 16 5 16H6V19C6 19.55 6.45 20 7 20H8C8.55 20 9 19.55 9 19V16H15V19C15 19.55 15.45 20 16 20H17C17.55 20 18 19.55 18 19V16H19C19.55 16 20 15.55 20 15V12C20 11.45 19.55 11 19 11H18ZM8 6C8 5.45 8.45 5 9 5H15C15.55 5 16 5.45 16 6V9H8V6ZM7.5 14C6.67 14 6 13.33 6 12.5C6 11.67 6.67 11 7.5 11C8.33 11 9 11.67 9 12.5C9 13.33 8.33 14 7.5 14ZM16.5 14C15.67 14 15 13.33 15 12.5C15 11.67 15.67 11 16.5 11C17.33 11 18 11.67 18 12.5C18 13.33 17.33 14 16.5 14Z" />
      </svg>
    );
  };
  
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
  
  // 1분마다 자동 새로고침
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      //console.log('🔄 자동 새로고침 (1분)');
      router.refresh();
    }, 60000);
    
    return () => clearInterval(refreshInterval);
  }, [router]);
  
  // 분침을 5분 단위로 정규화하여 표시 (시계 방향 1~12)
  const formatNormalizedMinutes = (timeString: string | null): string => {
    if (!timeString) return '-';
    try {
      const date = new Date(timeString);
      const minute = date.getMinutes();
      
      // 0분 또는 56분 이상은 12로 표시
      if (minute === 0 || minute >= 56) return '12';
      
      // 그 외는 5분 단위로 나눈 몫 (올림)
      // 예: 5분->1, 10분->2, ..., 55분->11
      // 1~4분 -> 1
      const idx = Math.ceil(minute / 5);
      return String(idx);
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

  // 학년별 배경색 클래스 반환
  const getGradeColorClass = (grade: number | null): string => {
    switch (Number(grade)) {
      case 4: return styles.bgCompetition; // 대회부 - 연갈색
      case 5: return styles.bgConcert;     // 연주회부 - 연두색
      case 6: return styles.bgNewbie;      // 신입생 - 하늘색
      case 7: return styles.bgEtc;         // 기타 - 연보라색
      default: return '';
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
  
  // 비고에서 방 번호 추출 및 연습번호 변환 (T, D, 숫자, 퇴실시 빈칸)
  const extractRoomNumber = (remark: string | null, actualOutTime: string | null): string => {
    // 중간퇴실(이미 퇴실한 상태)이면 빈칸
    if (actualOutTime) return '';

    if (!remark) return '-';
    if (remark.includes('이론')) return 'T';
    if (remark.includes('드럼')) return 'D';
    
    // 숫자만 추출
    const match = remark.match(/\d+/);
    return match ? match[0] : '-';
  };
  
  // 과정 아이콘 (요구사항 반영)
  const getCourseSymbol = (courseName: string): string => {
    if (!courseName) return '';
    if (courseName.includes('피아노+드럼')) return '◆';
    if (courseName.includes('피아노+이론')) return ''; // 없음
    if (courseName.includes('드럼')) return '■';
    if (courseName.includes('피아노')) return '▲'; // 피아노+이론이 먼저 걸러지므로 순서 중요
    if (courseName.includes('연습만')) return 'X';
    return '';
  };

  // 퇴실 시간 계산 (actual_out_time 우선, 없으면 빈 칸)
  const getExitTime = (session: Session): string => {
    if (session.actual_out_time) {
      return formatTime(session.actual_out_time);
    }
    return '';
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
                    <th>과정</th>
                    <th>이름</th>
                    <th>등원<br/>시간</th>
                    <th>연습<br/>종료</th>
                    <th>원장</th>
                    <th>{memberName}</th>
                    <th>이론</th>
                    <th>하원<br/>시간</th>
                    <th>차량</th>
                    <th>비고</th>
                  </tr>
                </thead>
                <tbody>
                  {columnData.map((student) => {
                    const isActive = hasActiveSession(student.sessions);
                    const latestSession = student.sessions[student.sessions.length - 1];
                    const isDrum = latestSession?.course_name?.includes('드럼');
                    const isReEntry = student.sessions.length > 1; // 재입실 여부 (세션이 2개 이상)
                    const roomNumber = extractRoomNumber(latestSession?.remark, latestSession?.actual_out_time);
                    const isTheoryRoom = roomNumber === 'T';
                      
                      // 피아노, 피아노+이론, 드럼, 피아노+드럼 모두 클릭 가능
                      const isClickable = latestSession?.course_name && (
                        latestSession.course_name.includes('피아노') ||
                        latestSession.course_name.includes('드럼')
                      );
                    
                    return (
                      <tr 
                        key={student.student_id}
                      >
                          <td>{roomNumber}</td>
                          <td>{getCourseSymbol(latestSession?.course_name)}</td>
                        <td className={`${styles.nameCell} ${getGradeColorClass(student.student_grade)}`}>
                            {student.student_name}
                        </td>
                        <td className={isReEntry ? styles.reEnter : ''}>{formatTime(latestSession?.in_time)}</td>
                          
                          {/* 연습종료 - 클릭 가능 (이론실이면 빈칸) */}
                          <td 
                            className={getStatusColorClass(latestSession.exit_minute_status, latestSession?.course_name || '', latestSession?.remark)}
                            onClick={() => isClickable && !isTheoryRoom && handleDrumStatusClick(
                              latestSession.attendance_num,
                              'exit_minute',
                              latestSession.exit_minute_status,
                              latestSession.course_name
                            )}
                            style={{ cursor: (isClickable && !isTheoryRoom) ? 'pointer' : 'default' }}
                          >
                            {isTheoryRoom ? '' : formatNormalizedMinutes(latestSession?.out_time)}
                          </td>
                          
                          {/* 원장 - 클릭 가능, 상태에 따른 아이콘 */}
                          <td 
                            className={getStatusColorClass(latestSession.director_status, latestSession?.course_name || '', latestSession?.remark)}
                            onClick={() => isClickable && handleDrumStatusClick(
                              latestSession.attendance_num,
                              'director',
                              latestSession.director_status,
                              latestSession.course_name
                            )}
                            style={{ cursor: isClickable ? 'pointer' : 'default' }}
                          >
                            {isClickable ? getStatusIcon(latestSession.director_status, memberId, 'director') : '●'}
                          </td>
                          
                          {/* 강사 - 클릭 가능, 상태에 따른 아이콘 */}
                          <td 
                            className={getStatusColorClass(latestSession.teacher_status, latestSession?.course_name || '', latestSession?.remark)}
                            onClick={() => isClickable && handleDrumStatusClick(
                              latestSession.attendance_num,
                              'teacher',
                              latestSession.teacher_status,
                              latestSession.course_name
                            )}
                            style={{ cursor: isClickable ? 'pointer' : 'default' }}
                          >
                            {isClickable ? getStatusIcon(latestSession.teacher_status, memberId, 'teacher') : getMemberIcon(memberId)}
                          </td>
                          
                          {/* 이론 - 클릭 가능, 원장 칸과 동일하게 작동 */}
                          <td 
                            className={getStatusColorClass(latestSession.theory_status, latestSession?.course_name || '', latestSession?.remark)}
                            onClick={() => isClickable && handleDrumStatusClick(
                              latestSession.attendance_num,
                              'theory',
                              latestSession.theory_status,
                              latestSession.course_name
                            )}
                            style={{ cursor: isClickable ? 'pointer' : 'default' }}
                          >
                            {isClickable ? getStatusIcon(latestSession.theory_status, memberId, 'theory') : '●'}
                          </td>
                          
                          <td>{getExitTime(latestSession)}</td>
                          
                          {/* 차량 - 클릭 가능 (차량 이용 학생만) */}
                          <td 
                            className={`${styles.iconCell} ${student.vehicle_yn ? styles.vehicleClickable : ''}`}
                            onClick={() => student.vehicle_yn && handleDrumStatusClick(
                              latestSession.attendance_num,
                              'vehicle',
                              latestSession.vehicle_status,
                              latestSession.course_name
                            )}
                            style={{ cursor: student.vehicle_yn ? 'pointer' : 'default' }}
                          >
                            {student.vehicle_yn ? getVehicleIcon(latestSession.vehicle_status) : ''}
                          </td>
                          
                          <td 
                            className={`${styles.remarkCell} ${student.special_notes ? styles.remarkCellClickable : ''}`}
                            onClick={() => openPopup(student.special_notes)}
                          >
                            {student.special_notes || '-'}
                        </td>
                      </tr>
                    );
                  })}
                  {/* 빈 행 렌더링 (격자 유지, 최소 25줄) */}
                  {Array.from({ length: Math.max(0, 25 - columnData.length) }).map((_, index) => (
                    <tr key={`empty-${index}`}>
                      <td>{'\u00A0'}</td>
                      <td>{'\u00A0'}</td>
                      <td>{'\u00A0'}</td>
                      <td>{'\u00A0'}</td>
                      <td>{'\u00A0'}</td>
                      <td>{'\u00A0'}</td>
                      <td>{'\u00A0'}</td>
                      <td>{'\u00A0'}</td>
                      <td>{'\u00A0'}</td>
                      <td>{'\u00A0'}</td>
                      <td>{'\u00A0'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            );
          })}
        </div>
      </main>
      
      {/* 비고 팝업 */}
      {isPopupOpen && (
        <div className={styles.popupOverlay} onClick={closePopup}>
          <div className={styles.popupContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.popupHeader}>
              <h3 className={styles.popupTitle}>비고 내용</h3>
              <button className={styles.closeButton} onClick={closePopup}>&times;</button>
            </div>
            <div className={styles.popupBody}>
              {popupContent}
            </div>
            <div className={styles.popupFooter}>
              <button className={styles.okButton} onClick={closePopup}>확인</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

