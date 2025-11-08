'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { logoutAction, removeFromWaitingQueueAction } from './actions';

// - 연습실 현황을 메인 대시보드 UI로 매핑하는 클라이언트 컴포넌트
// - 서버 컴포넌트에서 rows를 주입받아 화면만 책임

export type PracticeRow = {
  room_no: number;
  student_name: string | null;
  student_id: string | null;
  student_grade: number | null;
  in_time: string | null;
  out_time: string | null;
  turns: number;
  is_enabled: boolean;
  usage_yn: number;
};

export type KinderRow = {
  room_no: number;
  student_name: string | null;
  student_id: string | null;
  student_grade: number | null;
  in_time: string | null;
  out_time: string | null;
  turns: number;
  is_enabled: boolean;
  usage_yn: number;
};

export type DrumRow = {
  room_no: number;
  student_name: string | null;
  student_id: string | null;
  student_grade: number | null;
  in_time: string | null;
  out_time: string | null;
  turns: number;
  is_enabled: boolean;
  usage_yn: number;
};

import { ClassTimeSetting } from '@/app/lib/sql/maps/classTimeQueries';
import { WaitingQueueRow } from '@/app/lib/sql/maps/waitingQueueQueries';
import { StudentCourseInfo } from './page';
import dynamic from 'next/dynamic';

// TestTools는 개발 시에만 필요하므로 프로덕션 빌드에서 완전 제거
const TestTools = () => null;

type Props = { 
  rows: PracticeRow[]; 
  kinderRows: KinderRow[]; 
  drumRows: DrumRow[];
  classTimeSettings: ClassTimeSetting[];
  studentCourseInfos: StudentCourseInfo[];
  pianoWaitingQueue: WaitingQueueRow[];
  kinderWaitingQueue: WaitingQueueRow[];
};

// - 단일 방 카드 UI
interface RoomCardProps { id: number; name: string | null; time: string | null; number: string; color?: string; }
const RoomCard = ({ id, name, time, number, color }: RoomCardProps ) => (
  <div className="flex flex-col bg-gray-100 border border-gray-400 rounded-md">
    <div className={`px-3 py-1 font-bold text-center text-black ${color || 'bg-gray-300'} rounded-t-md`}>방 {id}</div>
    <div className="flex flex-col items-center justify-center flex-grow p-2 space-y-2">
      <div className="flex flex-col items-center justify-center w-full h-16 p-1 bg-white border border-gray-300 rounded">
        <p className="text-sm font-semibold md:text-base">{name || <>&nbsp;</>}</p>
        <p className="text-xs text-gray-600 md:text-sm whitespace-nowrap">{time || <>&nbsp;</>}</p>
      </div>
      <div className="flex items-center justify-center w-full h-16 text-4xl font-bold bg-white border border-gray-300 rounded">{number}</div>
    </div>
  </div>
);

// - 유치부 카드 UI (목업)
interface JuniorCardProps { id: number; color?: string; name?: string | null; time?: string | null; number?: string; }
const JuniorCard = ({ id, color, name, time, number }: JuniorCardProps) => (
  <div className="flex flex-col bg-gray-100 border border-gray-400 rounded-md">
    <div className={`px-3 py-1 font-bold text-center text-black ${color || 'bg-gray-300'} rounded-t-md`}>유치부 {id}</div>
    <div className="flex flex-col items-center justify-center flex-grow p-2 space-y-2">
      <div className="flex flex-col items-center justify-center w-full h-16 p-1 bg-white border border-gray-300 rounded">
        <p className="text-sm font-semibold md:text-base">{name || <>&nbsp;</>}</p>
        <p className="text-xs text-gray-600 md:text-sm whitespace-nowrap">{time || <>&nbsp;</>}</p>
      </div>
      <div className="flex items-center justify-center w-full h-16 text-4xl font-bold bg-white border border-gray-300 rounded">{number ?? '-'}</div>
    </div>
  </div>
);

// - 드럼실 테이블 목업
const DreamRoomTable = () => {
  const data = [ ['0','0','0','0'], ['0','0','0','0'], ['0','0','0','0'], ['0','0','0','0'] ];
  return (
    <div className="grid grid-cols-4 gap-1">
      {data.flat().map((item, index) => (
        <div key={index} className="flex items-center justify-center h-11 text-xs bg-white border border-gray-400 md:text-sm">{item}</div>
      ))}
    </div>
  );
};

// - 드럼실 간이 표: 이름(학년)과 시간 4행 표시 (학생별 수업 시간 적용)
function DrumRoomCompact({ 
  rows, 
  classTimeSettings, 
  studentCourseInfos 
}: { 
  rows: DrumRow[];
  classTimeSettings: ClassTimeSetting[];
  studentCourseInfos: StudentCourseInfo[];
}) {
  const cols = 4;
  const headers = Array.from({ length: cols }, (_, i) => rows[i] || null);
  const bodyRows = 4; // 표 하단 4행
  return (
    <div className="flex flex-col gap-1">
      <div className="grid grid-cols-4 gap-1">
        {headers.map((r, idx) => {
          const name = r?.student_name || '';
          
          // 계산된 퇴실 시간을 기준으로 분침 계산 (학생별 수업 시간 적용)
          let turns = '';
          if (r?.in_time && r?.student_id) {
            try {
              const inDate = new Date(String(r.in_time));
              if (!Number.isNaN(inDate.getTime())) {
                const normalizedInTime = normalizeInTime(inDate);
                
                // 학생별 수업 시간 계산
                const studentInfo = studentCourseInfos.find(info => info.student_id === r.student_id);
                let classDuration = 35; // 기본값
                if (studentInfo) {
                  classDuration = getStudentClassDuration(r.student_id, studentInfo.lesson_code, classTimeSettings, studentCourseInfos);
                }
                
                const calculatedOutTime = new Date(normalizedInTime.getTime() + classDuration * 60 * 1000);
                turns = computeTurnsFromOutTime(calculatedOutTime) || '';
              }
            } catch {
              turns = '';
            }
          }
          
          const turnText = turns && turns !== '-' ? `(${turns})` : '()';
          return (
            <div key={idx} className="flex items-center justify-center h-8 text-xs bg-white border border-gray-400 rounded">
              <span className="truncate px-1">{name} {turnText}</span>
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-4 gap-1">
        {Array.from({ length: bodyRows * cols }).map((_, i) => (
          <div key={i} className="flex items-center justify-center h-8 text-xs bg-white border border-gray-400 rounded">()</div>
        ))}
      </div>
    </div>
  );
}

export default function MainClient({ rows, kinderRows, drumRows, classTimeSettings, studentCourseInfos, pianoWaitingQueue, kinderWaitingQueue }: Props) {
  // - 헤더 우측 현재시각 표시용 타이머
  const [currentTime, setCurrentTime] = useState('');
  
  // 대기열 삭제 핸들러
  const handleRemoveFromQueue = async (queueId: string, studentId: string, queueType: 'piano' | 'kinder' | 'drum' = 'piano') => {
    try {
      const result = await removeFromWaitingQueueAction(queueId, studentId, queueType);
      if (result.success) {
        alert(result.message);
        // 페이지 새로고침으로 업데이트된 대기열 반영
        window.location.reload();
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error('대기열 삭제 오류:', error);
      alert('삭제 중 오류가 발생했습니다.');
    }
  };
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const days = ['일','월','화','수','목','금','토'];
      const dayName = days[now.getDay()];
      const hour24 = now.getHours();
      const hour12 = ((hour24 + 11) % 12) + 1; // 0→12, 13→1
      const minute = String(now.getMinutes()).padStart(2,'0');
      const formattedTime = `${now.getFullYear()} - ${String(now.getMonth()+1).padStart(2,'0')} - ${String(now.getDate()).padStart(2,'0')} (${dayName}) ${hour12}:${minute}`;
      setCurrentTime(formattedTime);
    }, 1000);
    return () => clearInterval(timer);
  }, []);


  // - 방번호 기준 빠른 조회를 위한 맵 구성
  const byRoom = new Map<number, PracticeRow>();
  rows.forEach(r => byRoom.set(r.room_no, r));

  // - 1~20호실 데이터를 UI 카드 모델로 변환
  //   · name 존재 시 초록 배경
  //   · time: 입/퇴실 합성 (학생별 수업 시간 적용)
  //   · number: 분침(5분 단위) 계산 결과 또는 '-'
  const roomData = Array.from({ length: 20 }, (_, idx) => {
    const roomNo = idx + 1;
    const r = byRoom.get(roomNo);
    const name = r?.student_name ?? null;
    const time = combineTime(r?.in_time, r?.out_time, r?.student_id, classTimeSettings, studentCourseInfos);
    
    // 계산된 퇴실 시간을 기준으로 분침 계산 (학생별 수업 시간 적용)
    let number = '-';
    if (r?.in_time && r?.student_id) {
      try {
        const inDate = new Date(String(r.in_time));
        if (!Number.isNaN(inDate.getTime())) {
          const normalizedInTime = normalizeInTime(inDate);
          
          // 학생별 수업 시간 계산
          const studentInfo = studentCourseInfos.find(info => info.student_id === r.student_id);
          let classDuration = 35; // 기본값
          if (studentInfo) {
            classDuration = getStudentClassDuration(r.student_id, studentInfo.lesson_code, classTimeSettings, studentCourseInfos);
          }
          
          const calculatedOutTime = new Date(normalizedInTime.getTime() + classDuration * 60 * 1000);
          number = computeTurnsFromOutTime(calculatedOutTime) || '-';
        }
      } catch {
        number = '-';
      }
    }
    
    // - 색상 규칙
    //   · 비활성화: 회색
    //   · 활성화: 홀수 방=초록, 짝수 방=노랑
    const color = !r?.is_enabled
      ? 'bg-gray-400'
      : (roomNo % 2 === 1 ? 'bg-green-300' : 'bg-yellow-300');
    return { id: roomNo, name, time, number, color };
  });

  // - 유치부 데이터: DB 값으로 대체 (이름/시간/분침 포함, 학생별 수업 시간 적용)
  const juniorData = Array.from({ length: 6 }, (_, idx) => {
    const roomNo = idx + 1;
    const r = kinderRows.find(k => k.room_no === roomNo);
    const enabled = r ? r.is_enabled : false;
    const displayName = r?.student_name ?? null;
    const time = combineTime(r?.in_time, r?.out_time, r?.student_id, classTimeSettings, studentCourseInfos);
    
    // 계산된 퇴실 시간을 기준으로 분침 계산 (학생별 수업 시간 적용)
    let number = '-';
    if (r?.in_time && r?.student_id) {
      try {
        const inDate = new Date(String(r.in_time));
        if (!Number.isNaN(inDate.getTime())) {
          const normalizedInTime = normalizeInTime(inDate);
          
          // 학생별 수업 시간 계산
          const studentInfo = studentCourseInfos.find(info => info.student_id === r.student_id);
          let classDuration = 35; // 기본값
          if (studentInfo) {
            classDuration = getStudentClassDuration(r.student_id, studentInfo.lesson_code, classTimeSettings, studentCourseInfos);
          }
          
          const calculatedOutTime = new Date(normalizedInTime.getTime() + classDuration * 60 * 1000);
          number = computeTurnsFromOutTime(calculatedOutTime) || '-';
        }
      } catch {
        number = '-';
      }
    }
    
    const color = !enabled ? 'bg-gray-400' : (roomNo % 2 === 1 ? 'bg-purple-500' : 'bg-sky-300');
    return { id: roomNo, color, name: displayName, time, number };
  });

  return (
    <div className="flex flex-col min-h-screen bg-gray-200">
      <header className="bg-gray-800 text-white shadow-md">
        <div className="container mx-auto flex justify-between items-center p-3">
          <div className="text-sm">관리자 님, 환영합니다 :)</div>
          <nav className="flex items-center justify-center space-x-0">
            <Link href="/main" className="px-6 py-1 text-sm hover:text-gray-300 bg-gray-800 hover:bg-gray-700 transition-colors">Main</Link>
            <Link href="/setting_manage" className="px-6 py-1 text-sm hover:text-gray-300 bg-gray-800 hover:bg-gray-700 transition-colors">Manage</Link>
            <form action={logoutAction} className="inline">
              <button type="submit" className="px-6 py-1 text-sm hover:text-gray-300 bg-gray-800 hover:bg-gray-700 transition-colors">Logout</button>
            </form>
          </nav>
        </div>
      </header>

      <main className="flex-grow p-4">
        <div className="container p-4 mx-auto bg-white shadow-lg" style={{ borderTop: '3px solid #F97316' }}>
          <div className="flex justify-end mb-2 text-sm font-semibold text-gray-700">{currentTime}</div>
          <div className="grid grid-cols-1 gap-0 xl:grid-cols-12">
            <div className="xl:col-span-10">
              <div className="grid grid-cols-2 gap-0 mb-0 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-10">
                {roomData.map(room => (<RoomCard key={room.id} {...room} />))}
              </div>
              <div className="grid grid-cols-10 gap-0">
                <div className="grid grid-cols-6 col-span-6 gap-0">
                  {juniorData.map(jr => (<JuniorCard key={jr.id} {...jr} />))}
                </div>
                <div className="flex flex-col col-span-3 gap-0">
                  <div className="border border-gray-400 rounded-md">
                    <div className="p-2 font-bold text-center text-white bg-blue-700 rounded-t-md">드럼실</div>
                    <div className="p-2"><DrumRoomCompact rows={drumRows} classTimeSettings={classTimeSettings} studentCourseInfos={studentCourseInfos} /></div>
                  </div>
                </div>
                <div className="flex items-end gap-2">
                  <div className="flex-grow text-xs border border-gray-400 rounded-md">
                    <div className="p-2 font-bold bg-gray-200 border-b border-gray-400 rounded-t-md">&lt;학습 과정 모형&gt;</div>
                    <ul className="p-2 space-y-1">
                      <li>⚫ : 피아노+이론</li>
                      <li>◆ : 피아노+드럼</li>
                      <li>■ : 드럼</li>
                      <li>▲ : 피아노</li>
                      <button className="px-6 py-2 font-bold text-white bg-blue-700 rounded-md">이론실</button>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col space-y-4 xl:col-span-2">
              <WaitingList 
                title="피아노 연습 대기" 
                waitingQueue={pianoWaitingQueue} 
                practiceRows={rows}
                classTimeSettings={classTimeSettings}
                studentCourseInfos={studentCourseInfos}
                onRemoveFromQueue={(queueId, studentId) => handleRemoveFromQueue(queueId, studentId, 'piano')}
              />
              <WaitingList 
                title="유치부 연습 대기" 
                waitingQueue={kinderWaitingQueue} 
                color="bg-pink-500"
                practiceRows={kinderRows}
                classTimeSettings={classTimeSettings}
                studentCourseInfos={studentCourseInfos}
                onRemoveFromQueue={(queueId, studentId) => handleRemoveFromQueue(queueId, studentId, 'kinder')}
              />
              <button className="px-4 py-6 text-2xl font-bold text-white bg-orange-500 rounded-lg hover:bg-orange-600" onClick={onEntrance}>입실</button>
              
              <button 
                className="px-4 py-6 text-2xl font-bold text-black bg-yellow-400 border-4 border-yellow-500 rounded-lg hover:bg-yellow-500 hover:border-yellow-600 transition-colors" 
                onClick={onExit}
              >
                퇴실
              </button>
              
              {/* 개발 모드 테스트 도구 - 필요시 수동으로 활성화 */}
              {/* {process.env.NODE_ENV === 'development' && <TestTools />} */}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// - 학생별 과정 정보에 따른 수업 시간 계산
function getStudentClassDuration(
  studentId: string, 
  lessonCode: number, 
  classTimeSettings: ClassTimeSetting[], 
  studentCourseInfos: StudentCourseInfo[]
): number {
  // 학생의 과정 정보 찾기
  const studentInfo = studentCourseInfos.find(info => info.student_id === studentId);
  if (!studentInfo) return 35; // 기본값 35분
  
  // 해당 학년의 수업 시간 설정 찾기
  const timeSetting = classTimeSettings.find(setting => setting.grade_name === studentInfo.grade_name);
  if (!timeSetting) return 35; // 기본값 35분
  
  // 과정 코드에 따른 수업 시간 반환
  switch (lessonCode) {
    case 1: // 피아노+이론
      return timeSetting.pt_piano || 35;
    case 2: // 피아노+드럼
      return timeSetting.pd_piano || 35;
    case 3: // 드럼
      return timeSetting.drum_only || 35;
    case 4: // 피아노
      return timeSetting.piano_only || 35;
    default:
      return 35;
  }
}

// - 입실 시간을 기준으로 학생별 수업 시간을 계산하여 "HH:mm ~ HH:mm" 형태로 표시
function combineTime(
  inTime?: string | null, 
  outTime?: string | null, 
  studentId?: string | null,
  classTimeSettings?: ClassTimeSetting[], 
  studentCourseInfos?: StudentCourseInfo[]
): string | null {
  if (!inTime) return null;
  
  try {
    const inDate = new Date(String(inTime));
    if (Number.isNaN(inDate.getTime())) return null;
    
    // 입실 시간을 정규화
    const normalizedInTime = normalizeInTime(inDate);
    
    // 학생별 수업 시간 계산 (기본값 35분)
    let classDuration = 35;
    if (studentId && classTimeSettings && studentCourseInfos) {
      const studentInfo = studentCourseInfos.find(info => info.student_id === studentId);
      if (studentInfo) {
        classDuration = getStudentClassDuration(studentId, studentInfo.lesson_code, classTimeSettings, studentCourseInfos);
      }
    }
    
    // 수업 시간만큼 더해서 퇴실 시간 계산
    const outDate = new Date(normalizedInTime.getTime() + classDuration * 60 * 1000);
    
    const inTimeStr = formatTimeCell(normalizedInTime);
    const outTimeStr = formatTimeCell(outDate);
    
    return `${inTimeStr} ~ ${outTimeStr}`;
  } catch {
    return null;
  }
}

// - 입실 시간 정규화 함수
function normalizeInTime(inDate: Date): Date {
  const minute = inDate.getMinutes();
  const normalized = new Date(inDate);
  
  let normalizedMinute: number;
  
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
  } else { // 58분 ~ 59분
    // 다음 시간의 00분으로 간주
    normalized.setHours(normalized.getHours() + 1);
    normalizedMinute = 0;
  }
  
  normalized.setMinutes(normalizedMinute, 0, 0);
  return normalized;
}

// - Date/문자 입력을 "HH:mm"로 포맷 (시간 앞의 0 제거)
function formatTimeCell(value: unknown): string {
  if (!value) return '';
  try {
    const d = value instanceof Date ? value : new Date(String(value));
    if (Number.isNaN(d.getTime())) return '';
    const hh = String(d.getHours());
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  } catch {
    return '';
  }
}

// - 분침 계산: out_time 기준, 5분 단위(1~12), 0분/56분 이상은 12
function computeTurnsFromOutTime(value: unknown): string {
  if (!value) return '-';
  try {
    const d = value instanceof Date ? value : new Date(String(value));
    if (Number.isNaN(d.getTime())) return '-';
    const minute = d.getMinutes();
    if (minute === 0 || minute >= 56) return '12';
    const idx = Math.ceil(minute / 5);
    return String(idx);
  } catch {
    return '-';
  }
}

// 방 배정 예상 정보 타입
type RoomAssignment = {
  roomNo: number;
  expectedExitTime: Date;
  instructorColor: string;
  instructorName: string;
};

// - 대기열 위젯 (실제 대기열 데이터 사용 + 방 배정 예상)
function WaitingList({ 
  title, 
  waitingQueue, 
  color = 'bg-purple-600',
  practiceRows = [],
  classTimeSettings = [],
  studentCourseInfos = [],
  onRemoveFromQueue
}: { 
  title: string; 
  waitingQueue: WaitingQueueRow[]; 
  color?: string;
  practiceRows?: PracticeRow[];
  classTimeSettings?: ClassTimeSetting[];
  studentCourseInfos?: StudentCourseInfo[];
  onRemoveFromQueue?: (queueId: string, studentId: string) => void;
}) {
  // 대기 시간 계산 (분 단위)
  const calculateWaitTime = (startTime: string): string => {
    const start = new Date(startTime);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - start.getTime()) / (1000 * 60));
    return `${diffMinutes}분`;
  };

  // 강사별 색상 매핑
  const getInstructorColor = (memberId: string): string => {
    const colors: { [key: string]: string } = {
      '1': 'bg-orange-500', // 1번 강사 - 주황색
      '2': 'bg-blue-500',   // 2번 강사 - 파랑색
      '3': 'bg-green-500',  // 3번 강사 - 초록색
      '99': 'bg-gray-500',  // 관리자 - 회색
      '0': 'bg-purple-500'  // 원장 - 보라색
    };
    return colors[memberId] || 'bg-gray-400';
  };

  // 방 배정 예상 계산
  const calculateRoomAssignments = (): RoomAssignment[] => {
    if (!practiceRows || practiceRows.length === 0) return [];

    const assignments: RoomAssignment[] = [];
    
    // 현재 사용 중인 방들의 예상 퇴실 시간 계산
    practiceRows.forEach(room => {
      if (room.student_id && room.in_time) {
        try {
          const inDate = new Date(String(room.in_time));
          if (!Number.isNaN(inDate.getTime())) {
            const normalizedInTime = normalizeInTime(inDate);
            
            // 학생별 수업 시간 계산
            const studentInfo = studentCourseInfos.find(info => info.student_id === room.student_id);
            let classDuration = 35; // 기본값
            if (studentInfo) {
              classDuration = getStudentClassDuration(room.student_id!, studentInfo.lesson_code, classTimeSettings, studentCourseInfos);
            }
            
            const expectedExitTime = new Date(normalizedInTime.getTime() + classDuration * 60 * 1000);
            
            // 해당 학생의 담당 강사 정보 조회
            let instructorId = '1'; // 기본값
            let instructorName = '강사';
            
            // 실제 학생 데이터에서 담당 강사 정보 가져오기
            const instructorInfo = studentCourseInfos.find(info => info.student_id === room.student_id);
            if (instructorInfo && instructorInfo.member_id && instructorInfo.member_name) {
              instructorId = instructorInfo.member_id;
              instructorName = instructorInfo.member_name;
            } else {
              // 담당 강사 정보가 없으면 방 번호에 따라 임시 배정
              if (room.room_no <= 7) {
                instructorId = '1';
                instructorName = '정영롱';
              } else if (room.room_no <= 14) {
                instructorId = '2';
                instructorName = '김선생';
              } else {
                instructorId = '3';
                instructorName = '이선생';
              }
            }

            assignments.push({
              roomNo: room.room_no,
              expectedExitTime,
              instructorColor: getInstructorColor(instructorId),
              instructorName
            });
          }
        } catch (error) {
          console.error('방 배정 계산 오류:', error);
        }
      }
    });

    // 퇴실 시간 순으로 정렬 (빠른 순서대로)
    assignments.sort((a, b) => a.expectedExitTime.getTime() - b.expectedExitTime.getTime());
    
    return assignments;
  };

  const roomAssignments = calculateRoomAssignments();

  // 표시할 행 수를 4개로 고정하고 스크롤 가능하게 설정
  const visibleRows = 4;
  // 대기열이 비어있어도 최소 4개 행은 표시하되, 대기열이 4개보다 많으면 모든 항목 표시
  const maxItems = Math.max(visibleRows, waitingQueue.length);

  return (
    <div className="flex flex-col">
      <h3 className={`p-2 text-sm font-bold text-center text-white ${color} rounded-t-md`}>
        {title} ({waitingQueue.length})
      </h3>
      
      {/* 헤더 행 */}
      <div className="bg-gray-100 border-x border-gray-400 px-1 py-1">
        <div className="flex items-center text-xs font-semibold text-gray-700">
          <div className="w-3 mr-2"></div> {/* 강사 표시 공간 */}
          <span className="flex-1">수강생이름</span>
          <span className="mr-1">도착시간</span>
          <span className="text-center">방배정<br/>입실예정</span>
          <span className="w-8 text-center">삭제</span>
        </div>
      </div>
      
      {/* 스크롤 가능한 리스트 영역 - 4개 행 높이로 고정 */}
      <div 
        className="bg-white border-x border-b border-gray-400 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100" 
        style={{ height: `${visibleRows * 2.15}rem` }}
      >
        <ul>
          {Array.from({ length: maxItems }, (_, index) => {
            const item = waitingQueue[index];
            
            if (item) {
              // 방 배정 예상 정보 가져오기
              const assignmentIndex = item.queue_number - 1;
              const assignment = roomAssignments[assignmentIndex];
              
              return (
                <li key={item.queue_id} className="flex items-center justify-between px-1 py-1 border-b border-gray-200 h-[2.15rem]">
                  <div className="flex items-center flex-1">
                    {/* 강사 표시 (색상 원) */}
                    <div className={`w-3 h-3 rounded-full mr-2 ${assignment ? assignment.instructorColor : 'bg-gray-300'}`}></div>
                    
                    {/* 수강생 이름 */}
                    <span className="text-xs text-gray-900 mr-2 flex-1 truncate">{item.student_name}</span>
                    
                    {/* 학원 도착 시간 */}
                    <span className="text-xs text-gray-600 mr-1">
                      {new Date(item.wait_start_time).toLocaleTimeString('ko-KR', { 
                        hour: 'numeric', 
                        minute: '2-digit',
                        hour12: false 
                      })}
                    </span>
                    
                    {/* 방 배정 및 예상 입실 시간 */}
                    <span className="text-xs font-bold text-blue-600">
                      {assignment ? (
                        <div className="text-center">
                          <div>{assignment.roomNo}번방</div>
                          <div className="text-xs text-gray-500">
                            {assignment.expectedExitTime.toLocaleTimeString('ko-KR', { 
                              hour: 'numeric', 
                              minute: '2-digit',
                              hour12: false 
                            })}
                          </div>
                        </div>
                      ) : '-'}
                    </span>
                    
                    {/* 삭제 버튼 */}
                    <button
                      onClick={() => {
                        if (onRemoveFromQueue && confirm(`${item.student_name}님을 대기열에서 삭제하시겠습니까?`)) {
                          onRemoveFromQueue(String(item.queue_id), item.student_id);
                        }
                      }}
                      className="w-6 h-6 ml-1 text-xs bg-red-500 hover:bg-red-600 text-white rounded flex items-center justify-center"
                      title="대기열에서 삭제"
                    >
                      ×
                    </button>
                  </div>
                </li>
              );
            } else {
              // 빈 행 표시 (새로운 형식에 맞게)
              return (
                <li key={`empty-${index}`} className="flex items-center px-1 py-1 border-b border-gray-200 h-[2.15rem]">
                  <div className="flex items-center flex-1">
                    {/* 빈 강사 표시 */}
                    <div className="w-3 h-3 rounded-full mr-2 bg-gray-200"></div>
                    
                    {/* 빈 수강생 이름 */}
                    <span className="text-xs text-gray-400 mr-2 flex-1">-</span>
                    
                    {/* 빈 도착 시간 */}
                    <span className="text-xs text-gray-400 mr-2">-</span>
                    
                    {/* 빈 방 배정 */}
                    <span className="text-xs text-gray-400">-</span>
                    
                    {/* 빈 삭제 버튼 공간 */}
                    <div className="w-6 h-6 ml-1"></div>
                  </div>
                </li>
              );
            }
          })}
        </ul>
      </div>
    </div>
  );
}

async function onEntrance() {
  try {
    const studentId = window.prompt('수강생 고유번호를 입력하세요!')?.trim();
    if (!studentId) return;
    const res = await fetch('/api/process-entrance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ studentId }) });
    const text = await res.text();
    alert(text || '처리되었습니다.');
    if (res.ok) location.reload();
  } catch (e) {
    alert('처리 중 오류가 발생했습니다.');
  }
}

async function onExit() {
  try {
    const studentId = window.prompt('퇴실할 수강생 고유번호를 입력하세요!')?.trim();
    if (!studentId) return;
    
    // 퇴실 가능 여부 확인
    const checkRes = await fetch('/api/check-exit-eligibility', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId })
    });
    
    if (!checkRes.ok) {
      alert('퇴실 가능 여부 확인 중 오류가 발생했습니다.');
      return;
    }
    
    const checkData = await checkRes.json();
    
    // 상태에 따른 알림창 표시
    switch (checkData.status) {
      case 'not_entered':
        alert('입실 상태가 아닙니다.');
        break;
        
      case 'time_insufficient':
        alert(checkData.message); // "X분 남음"
        break;
        
      case 'can_exit':
        alert(checkData.message); // "O"
        break;
        
      default:
        alert('알 수 없는 상태입니다.');
        break;
    }
    
  } catch (e) {
    console.error('퇴실 처리 오류:', e);
    alert('퇴실 처리 중 오류가 발생했습니다.');
  }
}




