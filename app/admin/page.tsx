'use client';

// 기존 page_admin_sample_v0.2.tsx의 레이아웃을 활용한 관리자 전용 페이지
import { useState, useEffect } from 'react';
import { logoutAction } from './actions';

interface RoomCardProps { id: number; name: string | null; time: string | null; number: string; color?: string; }
const RoomCard = ({ id, name, time, number, color }: RoomCardProps ) => (
  <div className="flex flex-col bg-gray-100 border border-gray-400 rounded-md">
    <div className={`px-3 py-1 font-bold text-center text-black ${color || 'bg-gray-300'} rounded-t-md`}>방 {id}</div>
    <div className="flex flex-col items-center justify-center flex-grow p-2 space-y-2">
      <div className="flex flex-col items-center justify-center w-full h-16 p-1 bg-white border border-gray-300 rounded">
        <p className="text-sm font-semibold md:text-base">{name || <>&nbsp;</>}</p>
        <p className="text-xs text-gray-600 md:text-sm">{time || <>&nbsp;</>}</p>
      </div>
      <div className="flex items-center justify-center w-full h-16 text-4xl font-bold bg-white border border-gray-300 rounded">{number}</div>
    </div>
  </div>
);

interface JuniorCardProps { id: number; color?: string; }
const JuniorCard = ({ id, color }: JuniorCardProps) => (
  <div className="flex flex-col bg-gray-100 border border-gray-400 rounded-md">
    <div className={`px-3 py-1 font-bold text-center text-black ${color || 'bg-gray-300'} rounded-t-md`}>유치부 {id}</div>
    <div className="flex flex-col items-center justify-center flex-grow p-2 space-y-2">
      <div className="flex flex-col items-center justify-center w-full h-16 p-1 bg-white border border-gray-300 rounded">
        <p>&nbsp;</p>
        <p>&nbsp;</p>
      </div>
      <div className="flex items-center justify-center w-full h-16 text-4xl font-bold bg-white border border-gray-300 rounded">-</div>
    </div>
  </div>
);

interface WaitingListProps { title: string; count: number; color?: string; }
const WaitingList = ({ title, count, color = 'bg-purple-600' }: WaitingListProps)  => (
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

export default function AdminPage() {
  const [currentTime, setCurrentTime] = useState('');
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const days = ['일','월','화','수','목','금','토'];
      const dayName = days[now.getDay()];
      const formattedTime = `${now.getFullYear()} - ${String(now.getMonth()+1).padStart(2,'0')} - ${String(now.getDate()).padStart(2,'0')} (${dayName}) ${String(now.getHours()).padStart(2,'0')} : ${String(now.getMinutes()).padStart(2,'0')}`;
      setCurrentTime(formattedTime);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const roomData = [
    { id: 1, name: '박현서', time: '3:05 ~ 3:40', number: '8' },
    { id: 2, name: '이유나*', time: '3:05 ~ 3:40', number: '8', color: 'bg-yellow-300' },
    { id: 3, name: '홍예은', time: '3:20 ~ 3:55', number: '11' },
    { id: 4, name: null, time: null, number: '-', color: 'bg-yellow-300' },
    { id: 5, name: '전지민*', time: '3:05 ~ 3:40', number: '8' },
    { id: 6, name: '김윤영*', time: '3:20 ~ 3:55', number: '11', color: 'bg-yellow-300' },
    { id: 7, name: '홍예준', time: '3:25 ~ 3:55', number: '11' },
    { id: 8, name: '김연우*', time: '3:05 ~ 3:40', number: '8', color: 'bg-yellow-300' },
    { id: 9, name: null, time: null, number: '-' },
    { id: 10, name: null, time: null, number: '-', color: 'bg-yellow-300' },
    { id: 11, name: null, time: null, number: '-' },
    { id: 12, name: null, time: null, number: '-', color: 'bg-green-300' },
    { id: 13, name: null, time: null, number: '-' },
    { id: 14, name: null, time: null, number: '-', color: 'bg-yellow-300' },
    { id: 15, name: null, time: null, number: '-' },
    { id: 16, name: null, time: null, number: '-' },
    { id: 17, name: null, time: null, number: '-' },
    { id: 18, name: null, time: null, number: '-' },
    { id: 19, name: null, time: null, number: '-' },
    { id: 20, name: null, time: null, number: '-', color: 'bg-green-300' },
  ];

  const juniorData = [ { id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }, { id: 6 } ];

  return (
    <div className="flex flex-col min-h-screen bg-gray-200">
      <header className="bg-gray-800 text-white shadow-md">
        <div className="container mx-auto flex justify-between items-center p-3">
          <div className="text-sm">관리자 님, 환영합니다 :)</div>
          <nav className="flex items-center space-x-6">
            <a href="#" className="text-sm hover:text-gray-300">Main</a>
            <a href="#" className="text-sm hover:text-gray-300">Manage</a>
            <form action={logoutAction}>
              <button type="submit" className="text-sm hover:text-gray-300">Logout</button>
            </form>
          </nav>
        </div>
      </header>

      <main className="flex-grow p-4">
        <div className="container p-4 mx-auto bg-white shadow-lg" style={{ borderTop: '3px solid #F97316' }}>
          <div className="flex justify-end mb-2 text-sm font-semibold text-gray-700">{currentTime}</div>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
            <div className="xl:col-span-10">
              <div className="grid grid-cols-2 gap-3 mb-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-10">
                {roomData.map(room => (<RoomCard key={room.id} {...room} />))}
              </div>
              <div className="grid grid-cols-10 gap-3">
                <div className="grid grid-cols-6 col-span-6 gap-3">
                  {juniorData.map(jr => (<JuniorCard color={undefined} key={jr.id} {...jr} />))}
                </div>
                <div className="flex flex-col col-span-3 gap-2">
                  <div className="border border-gray-400 rounded-md">
                    <div className="p-2 font-bold text-center text-white bg-blue-700 rounded-t-md">드럼실</div>
                    <div className="p-2"><DreamRoomTable /></div>
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


