'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { logoutAction } from './actions';

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

type Props = { rows: PracticeRow[]; kinderRows: KinderRow[]; drumRows: DrumRow[] };

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

// - 드럼실 간이 표: 이름(학년)과 시간 4행 표시
function DrumRoomCompact({ rows }: { rows: DrumRow[] }) {
  const cols = 4;
  const headers = Array.from({ length: cols }, (_, i) => rows[i] || null);
  const bodyRows = 4; // 표 하단 4행
  return (
    <div className="flex flex-col gap-1">
      <div className="grid grid-cols-4 gap-1">
        {headers.map((r, idx) => {
          const name = r?.student_name || '';
          const turns = r?.out_time ? computeTurnsFromOutTime(r.out_time) : '';
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

export default function MainClient({ rows, kinderRows, drumRows }: Props) {
  // - 헤더 우측 현재시각 표시용 타이머
  const [currentTime, setCurrentTime] = useState('');
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
  //   · time: 입/퇴실 합성
  //   · number: 분침(5분 단위) 계산 결과 또는 '-'
  const roomData = Array.from({ length: 20 }, (_, idx) => {
    const roomNo = idx + 1;
    const r = byRoom.get(roomNo);
    const name = r?.student_name ?? null;
    const time = combineTime(r?.in_time, r?.out_time);
    const number = r ? computeTurnsFromOutTime(r.out_time) || '-' : '-';
    // - 색상 규칙
    //   · 비활성화: 회색
    //   · 활성화: 홀수 방=초록, 짝수 방=노랑
    const color = !r?.is_enabled
      ? 'bg-gray-400'
      : (roomNo % 2 === 1 ? 'bg-green-300' : 'bg-yellow-300');
    return { id: roomNo, name, time, number, color };
  });

  // - 유치부 데이터: DB 값으로 대체 (이름/시간/분침 포함)
  const juniorData = Array.from({ length: 6 }, (_, idx) => {
    const roomNo = idx + 1;
    const r = kinderRows.find(k => k.room_no === roomNo);
    const enabled = r ? r.is_enabled : false;
    const displayName = r?.student_name ?? null;
    const time = combineTime(r?.in_time, r?.out_time);
    const number = r ? computeTurnsFromOutTime(r.out_time) || '-' : '-';
    const color = !enabled ? 'bg-gray-400' : (roomNo % 2 === 1 ? 'bg-purple-500' : 'bg-sky-300');
    return { id: roomNo, color, name: displayName, time, number };
  });

  return (
    <div className="flex flex-col min-h-screen bg-gray-200">
      <header className="bg-gray-800 text-white shadow-md">
        <div className="container mx-auto flex justify-between items-center p-3">
          <div className="text-sm">관리자 님, 환영합니다 :)</div>
          <nav className="flex items-center space-x-6">
            <a href="#" className="text-sm hover:text-gray-300">Main</a>
            <Link href="/setting_manage" className="text-sm hover:text-gray-300">Manage</Link>
            <form action={logoutAction}>
              <button type="submit" className="text-sm hover:text-gray-300">Logout</button>
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
                    <div className="p-2"><DrumRoomCompact rows={drumRows} /></div>
                  </div>
                </div>
                <div className="flex items-end gap-2">
                  <div className="flex-grow text-xs border border-gray-400 rounded-md">
                    <div className="p-2 font-bold bg-gray-200 border-b border-gray-400 rounded-t-md">&lt;학습 과정 포함&gt;</div>
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
              <WaitingList title="피아노 연습 대기" count={8} />
              <WaitingList title="유치부 연습 대기" count={5} color="bg-pink-500" />
              <button className="px-4 py-6 text-2xl font-bold text-white bg-orange-500 rounded-lg hover:bg-orange-600">입실</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// - 입/퇴실 시간을 "HH : mm ~ HH : mm" 형태로 합성
function combineTime(inTime?: string | null, outTime?: string | null): string | null {
  const a = formatTimeCell(inTime);
  const b = formatTimeCell(outTime);
  if (!a && !b) return null;
  if (a && b) return `${a} ~ ${b}`;
  return a || b;
}

// - Date/문자 입력을 "HH : mm"로 포맷
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

// - 대기열 위젯 (단순 숫자 나열)
function WaitingList({ title, count, color = 'bg-purple-600' }: { title: string; count: number; color?: string; })  {
  return (
    <div className="flex flex-col">
      <h3 className={`p-2 text-sm font-bold text-center text-white ${color} rounded-t-md`}>{title}</h3>
      <div className="flex-grow bg-white border-x border-b border-gray-400">
        <ul className="h-full">
          {Array.from({ length: count }, (_, i) => (
            <li key={i} className="flex items-center px-2 py-1 border-b border-gray-200 h-[2.15rem]">
              <span className="mr-2 text-sm text-gray-500">{i + 1}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}


