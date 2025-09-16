// - 학생 데이터의 구조를 정의하는 타입 (DB 스키마에 맞게 수정)
export type Student = {
  student_num: number;        // 순번 (PRIMARY KEY)
  student_name: string;       // 이름
  student_id: string;         // 고유번호 (UNIQUE)
  student_school: string;     // 학교
  student_grade: number;      // 학년
  member_id: string;          // 담당강사 ID
  member_name?: string;       // 담당강사 이름 (조인 결과)
  course_code: number;        // 과정구분
  vehicle_yn: boolean;        // 차량탑승여부
  special_notes?: string;     // 특이사항
  is_active: boolean;         // 활성화 여부
  created_time?: string;      // 생성시간
};

// - 앱 최초 실행 시 사용될 초기 데이터
// - 애플리케이션 전체에서 공유하는 학생 원본 데이터 배열
const initialMockData: Student[] = [
  // 👇 course 값을 모두 숫자로 변경
  { id: 1, name: '수강생1', uniqueId: 1111, school: '테스트초', grade: 1, member: '강사테스트1', course: 5, vehicle: null },
  { id: 2, name: '수강생2', uniqueId: 9111, school: '테스트초', grade: 2, member: '강사테스트2', course: 2, vehicle: null },
  { id: 3, name: '수강생3', uniqueId: 2222, school: '테스트초', grade: 1, member: '강사테스트1', course: 5, vehicle: null },
  { id: 4, name: '수강생4', uniqueId: 9222, school: '테스트초', grade: 2, member: '강사테스트2', course: 5, vehicle: null },
  { id: 5, name: '수강생5', uniqueId: 3333, school: '테스트초', grade: 1, member: '강사테스트1', course: 5, vehicle: null },
  { id: 6, name: '수강생6', uniqueId: 9333, school: '테스트초', grade: 2, member: '강사테스트2', course: 2, vehicle: null },
  { id: 7, name: '수강생7', uniqueId: 4444, school: '테스트초', grade: 1, member: '강사테스트1', course: 5, vehicle: null },
];

// - localStorage에서 학생 목록을 가져오는 함수
// - 데이터가 없으면 초기 데이터로 설정 후 반환
export const getStudents = (): Student[] => {
    // - 서버 사이드 렌더링 중에는 localStorage 접근 방지
    if (typeof window === 'undefined') {
        return initialMockData;
    }
    const data = localStorage.getItem('students');
    if (data) {
        return JSON.parse(data);
    } else {
        localStorage.setItem('students', JSON.stringify(initialMockData));
        return initialMockData;
    }
};

// - localStorage에 새로운 학생을 추가하는 함수
export const addStudent = (student: Omit<Student, 'id'>) => {
    if (typeof window === 'undefined') {
        return;
    }
    const students = getStudents();

    // ===== 💡 핵심 수정 사항 =====
    // - 현재 학생들 중 가장 큰 ID 찾기.
    const maxId = students.reduce((max, current) => (current.id > max ? current.id : max), 0);
    
    // - 가장 큰 ID에 1을 더해 새로운 순차적 ID를 생성
    const newStudent: Student = { ...student, id: maxId + 1 };
    // ===== 수정 끝 =====

    const updatedStudents = [...students, newStudent];
    localStorage.setItem('students', JSON.stringify(updatedStudents));
};