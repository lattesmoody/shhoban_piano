'use client';

// React 훅(Hook) import
// - useState: 컴포넌트의 상태 관리를 위한 훅
// - useEffect: 사이드 이펙트(side effect) 처리를 위한 훅
import { useState, useEffect } from 'react';

// 메인 페이지 컴포넌트 정의
export default function HomePage() {
    // --- 상태(State) 정의 ---
    // - currentTime: 현재 시간 문자열을 저장하는 상태
    // - setCurrentTime: currentTime 상태 업데이트 함수
    // - 초기값: 빈 문자열('')
    const [currentTime, setCurrentTime] = useState('');

    // --- 이펙트(Effect) 정의 ---
    // - 목적: 컴포넌트 마운트 시, 1초마다 시간 업데이트
    // - 실행 시점: 최초 렌더링 시 한 번만 실행 (의존성 배열: [])
    useEffect(() => {
        // - 타이머 설정: 1초(1000ms) 간격으로 반복 실행
        const timer = setInterval(() => {
            // - Date 객체 생성: 현재 날짜 및 시간 정보 획득
            const now = new Date();
            // - 요일 배열: 숫자 요일(0-6)을 문자열로 변환하기 위함
            const days = ['일', '월', '화', '수', '목', '금', '토'];
            // - 현재 요일 계산
            const dayName = days[now.getDay()];
            // - 시간 포맷팅: "YYYY - MM - DD (요일) HH : MM" 형식으로 변환
            const formattedTime = `${now.getFullYear()} - ${String(now.getMonth() + 1).padStart(2, '0')} - ${String(now.getDate()).padStart(2, '0')} (${dayName}) ${String(now.getHours()).padStart(2, '0')} : ${String(now.getMinutes()).padStart(2, '0')}`;
            // - 상태 업데이트: 포맷팅된 시간으로 currentTime 상태 변경
            setCurrentTime(formattedTime);
        }, 1000);

        // --- 클린업(Cleanup) 함수 ---
        // - 목적: 컴포넌트 언마운트 시 setInterval 정리
        // - 동작: 설정된 타이머를 해제하여 메모리 누수 방지
        return () => clearInterval(timer);
    }, []);

    // --- UI 렌더링 (JSX) ---
    // - 컴포넌트가 화면에 표시할 UI 구조 반환
    return (
        // 루트 컨테이너: 전체 페이지를 감싸는 flexbox 컨테이너
        <div className="flex flex-col min-h-screen bg-gray-50">
            {/* 헤더 섹션 */}
            <header className="bg-rose-400 text-black shadow-md">
                <div className="container mx-auto flex justify-between items-center p-3">
                    {/* 좌측 메시지 */}
                    <div className="text-sm font-semibold">로그인 해주세요!</div>
                    {/* 우측 네비게이션 링크 */}
                    <nav className="flex items-center space-x-6">
                        <a href="#" className="text-sm hover:text-gray-700">Main</a>
                        <a href="#" className="text-sm hover:text-gray-700">Login</a>
                    </nav>
                </div>
            </header>

            {/* 메인 콘텐츠 섹션 */}
            <main className="flex-grow p-4">
                <div className="container mx-auto">
                    {/* 시간 표시 영역 */}
                    <div className="flex justify-end mb-2 text-sm font-semibold text-gray-700">
                        {currentTime}
                    </div>
                    {/* 중앙 콘텐츠 박스 */}
                    <div className="w-full h-[85vh] bg-white" style={{border: '2px solid #9f1239'}}>
                        {/* 실제 콘텐츠가 위치할 영역 */}
                    </div>
                </div>
            </main>
        </div>
    );
}

