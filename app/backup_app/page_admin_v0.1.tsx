// app/page.tsx

'use client';

import React, { useState, useEffect } from 'react';

// 각 방의 상태를 나타내는 카드 컴포넌트
const RoomCard = ({ title, status, bgColor = 'bg-gray-200' }: { title: string, status: string, bgColor?: string }) => (
  <div className={`p-2 border border-gray-300 rounded-md shadow-sm text-center flex flex-col justify-between h-32 ${bgColor}`}>
    <div className="font-bold bg-gray-100 rounded-t-md -m-2 mb-2 py-1">{title}</div>
    <div className="flex-grow flex flex-col items-center justify-center">
      <span className="text-gray-600 text-sm">-</span>
      <span className="text-gray-600 text-sm">-</span>
    </div>
    <div className="bg-white border-t border-gray-300 rounded-b-md -m-2 mt-2 py-1">
       <span className="text-gray-800 font-semibold">-</span>
    </div>
  </div>
);

// 대기 목록 컴포넌트
const WaitingList = ({ title, count }: { title: string, count: number }) => (
  <div className="bg-white p-2 rounded-md shadow-inner">
    <h3 className="text-center font-bold bg-purple-200 text-purple-800 py-1 rounded-md mb-2">{title}</h3>
    <div className="grid grid-cols-2 gap-1 text-sm">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center border border-gray-200 rounded-sm">
          <span className="font-semibold w-6 text-center bg-gray-100">{i + 1}</span>
          <div className="flex-1 h-6"></div>
        </div>
      ))}
    </div>
  </div>
);


export default function Home() {
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const date = String(now.getDate()).padStart(2, '0');
      const day = ['일', '월', '화', '수', '목', '금', '토'][now.getDay()];
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      setCurrentTime(`${year} - ${month} - ${date} (${day}) ${hours}:${minutes}`);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const rooms = [
    { title: '방 1' }, { title: '방 2'}, { title: '방 3' }, { title: '방 4' }, { title: '방 5' },
    { title: '방 6'}, { title: '방 7' }, { title: '방 8' }, { title: '방 9' }, { title: '방 10' },
    { title: '방 11' }, { title: '방 12' }, { title: '방 13' }, { title: '방 14' }, { title: '방 15' },
    { title: '방 16' }, { title: '방 17' }, { title: '방 18' }, { title: '방 19' }, { title: '방 20'},
  ];

  const kindergartenRooms = [
    { title: '유치부 1' }, { title: '유치부 2'}, { title: '유치부 3' },
    { title: '유치부 4' }, { title: '유치부 5' }, { title: '유치부 6' },
  ];

  const LegendItem = ({ shape, color, text }: { shape: 'diamond' | 'circle' | 'square' | 'triangle', color: string, text: string }) => {
    const shapeStyles: React.CSSProperties = {
        width: '12px',
        height: '12px',
        backgroundColor: shape !== 'diamond' ? color : undefined,
        borderColor: color,
        borderWidth: shape === 'diamond' ? '1px' : '0',
        transform: shape === 'diamond' ? 'rotate(45deg)' : 'none',
        clipPath: {
            'triangle': 'polygon(50% 0%, 0% 100%, 100% 100%)',
            'circle': 'circle(50% at 50% 50%)', 
            'diamond': 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)', 
            'square': 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)'
        }[shape],
        borderRadius: shape === 'circle' ? '50%' : '0'
    };

    return (
        <div className="flex items-center space-x-2 text-sm">
            <div style={shapeStyles}></div>
            <span>: {text}</span>
        </div>
    );
  };


  return (
    <div className="min-h-screen bg-gray-100 text-gray-800 p-4 font-sans">
      {/* Header */}
      <header className="flex justify-between items-center bg-white p-3 rounded-lg shadow-md mb-4">
        <div>
          <span className="font-semibold">관리자 님, 환영합니다 :)</span>
        </div>
        <nav className="flex items-center space-x-4">
          <a href="#" className="text-blue-600 hover:underline">Main</a>
          <a href="#" className="text-blue-600 hover:underline">Manage</a>
          <a href="#" className="text-red-600 hover:underline">Logout</a>
        </nav>
      </header>

      <div className="flex gap-4">
        {/* Main Content */}
        <main className="flex-1 bg-white p-4 rounded-lg shadow-lg border-2 border-orange-300">
          <div className="grid grid-cols-10 gap-2">
            {rooms.map(room => <RoomCard key={room.title} title={room.title} status="-" bgColor={room.color} />)}
          </div>
          
          <div className="mt-2 grid grid-cols-10 gap-2 items-start">
            <div className="col-span-6 grid grid-cols-6 gap-2">
                {kindergartenRooms.map(room => <RoomCard key={room.title} title={room.title} status="-" bgColor={room.color} />)}
            </div>

            <div className="col-span-4 flex gap-2">
                 {/* 드럼실 */}
                <div className="flex-1 bg-blue-400 text-white p-2 rounded-md shadow-md">
                    <h3 className="text-center font-bold mb-2">드럼실</h3>
                    <div className="grid grid-cols-4 gap-1 text-center text-sm">
                        {Array.from({ length: 12 }).map((_, i) => (
                            <div key={i} className="bg-blue-900 p-1 rounded-sm">0</div>
                        ))}
                    </div>
                </div>

                {/* 학습 과정 모형 */}
                <div className="flex-1 p-2 rounded-md text-sm space-y-2 border border-gray-300">
                    <h4 className="font-bold text-center">&lt;학습 과정 모형&gt;</h4>
                    <LegendItem shape="diamond" color="black" text="피아노+이론" />
                    <LegendItem shape="circle" color="black" text="피아노+드럼" />
                    <LegendItem shape="square" color="black" text="드럼" />
                    <LegendItem shape="triangle" color="black" text="피아노" />
                    <button className="w-full mt-2 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition duration-300">
                        이론실
                    </button>
                </div>
            </div>
          </div>
        </main>

        {/* Sidebar */}
        <aside className="w-64 space-y-4">
          <div className="bg-white p-3 text-center rounded-lg shadow-md font-semibold text-lg">
            {currentTime}
          </div>
          <div className="space-y-4">
            <WaitingList title="피아노 연습 대기" count={16} />
            <WaitingList title="유치부 연습 대기" count={8} />
          </div>
          <button className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-lg shadow-lg text-2xl transition duration-300">
            입실
          </button>
        </aside>
      </div>
    </div>
  );
}


// 컴포넌트 구조화: 
// - 이미지의 각 부분을 재사용 가능한 컴포넌트(RoomCard, WaitingList) 활용

// 상태 관리: 
// - 현재 시간을 1초마다 업데이트하여 화면에 실시간으로 표시 (기존 홈페이지는 5초? 마다 갱신)
// - useEffect와 useState를 사용

// 동적 렌더링: 
// map 함수를 사용하여 방 목록 데이터를 기반으로 여러 개의 RoomCard를 동적으로 생성
// 색상이 다른 방은 데이터에 color 속성을 추가하여 조건부로 스타일을 적용

// 스타일링: 
// Tailwind CSS의 유틸리티 클래스를 사용
// Flexbox와 Grid 기반의 반응형 레이아웃을 구성
// 색상, 여백, 그림자 등 세부적인 스타일을 이미지와 유사하게 구현