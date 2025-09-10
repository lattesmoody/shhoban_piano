// - 학생 데이터의 구조를 정의하는 타입
export type Student = {
  id: number;
  name: string;
  uniqueId: number;
  school: string;
  grade: number;
  member: string;
  course: string;
  vehicle: string | null;
};

// - 애플리케이션 전체에서 공유하는 학생 원본 데이터 배열
export const mockStudentData: Student[] = [
  { id: 1, name: '수강생1', uniqueId: 1111, school: '테스트초', grade: 1, member: '강사테스트1', course: '5일 반', vehicle: null },
  { id: 2, name: '수강생2', uniqueId: 9111, school: '테스트초', grade: 2, member: '강사테스트2', course: '2일 반', vehicle: null },
  { id: 3, name: '수강생3', uniqueId: 2222, school: '테스트초', grade: 1, member: '강사테스트1', course: '5일 반', vehicle: null },
  { id: 4, name: '수강생4', uniqueId: 9222, school: '테스트초', grade: 2, member: '강사테스트2', course: '5일 반', vehicle: null },
  { id: 5, name: '수강생5', uniqueId: 3333, school: '테스트초', grade: 1, member: '강사테스트1', course: '5일 반', vehicle: null },
  { id: 6, name: '수강생6', uniqueId: 9333, school: '테스트초', grade: 2, member: '강사테스트2', course: '2일 반', vehicle: null },
  { id: 7, name: '수강생7', uniqueId: 4444, school: '테스트초', grade: 1, member: '강사테스트1', course: '5일 반', vehicle: null },
];