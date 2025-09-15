import styles from './page.module.css';
import Link from 'next/link';


// 관리 메뉴 항목 배열
const adminMenuItems = [
  '수강생 관리',
  '강사 관리',
  '연습실 관리',
  '드럼실 관리',
  '유치부실 관리',
  '수강생 출석 확인',
  '과정별 수업 시간 설정',
  '일일 수강 현황 초기화',
];

export default function AdminDashboard() {
  return (
    <div className={styles.container}>
      {/* 상단 헤더 */}
      <header className={styles.header}>
        <div className={styles.welcomeMessage}>
          <span><strong>관리자</strong> 님, 환영합니다 : )</span>
        </div>
        <nav className={styles.nav}>
          <a href="#">Main</a>
          <a href="#">Manage</a>
          <a href="#">Logout</a>
        </nav>
      </header>

      {/* 메인 컨텐츠 (메뉴 버튼) */}
      <main className={styles.mainContent}>
        <div className={styles.menuGrid}>
          {adminMenuItems.map((item, index) => (
            index === 0 ? (
              <Link key={index} href="/student_manage">
                <button className={styles.menuButton}>
                  {item}
                </button>
              </Link>
            ) : index === 1 ? (
              <Link key={index} href="/member_manage">
                <button className={styles.menuButton}>
                  {item}
                </button>
              </Link>
            ) : index === 2 ? (
              <Link key={index} href="/practice_room_manage">
                <button className={styles.menuButton}>
                  {item}
                </button>
              </Link>
            ) : index === 3 ? (
              <Link key={index} href="/drumroom_manage">
                <button className={styles.menuButton}>
                  {item}
                </button>
              </Link>
            ) : (
              <button key={index} className={styles.menuButton}>
                {item}
              </button>
            )
          ))}
        </div>
      </main>
    </div>
  );
}