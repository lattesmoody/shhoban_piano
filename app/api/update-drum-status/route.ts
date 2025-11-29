import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

function normalizePlaceholder(raw: string | undefined): string {
  const input = (raw || '').trim();
  if (!input) return '';
  let normalized = input.replace(/\\\$/g, '$');
  normalized = normalized.replace(/`(\$\d+)/g, '$1');
  normalized = normalized.replace(/\\"/g, '"');
  return normalized;
}

export async function POST(request: Request) {
  try {
    const { attendance_num, field, current_status, course_name } = await request.json();
    
    if (!attendance_num || !field) {
      return NextResponse.json(
        { success: false, error: '필수 파라미터가 없습니다.' },
        { status: 400 }
      );
    }
    
    // vehicle은 2단계, theory는 3단계, 피아노+드럼은 5단계, 그 외는 3단계
    let maxStatus;
    if (field === 'vehicle') {
      maxStatus = 2; // 차량: 1(탑승 대기) → 2(탑승 완료)
    } else if (field === 'theory') {
      maxStatus = 3; // 이론: 1(-) → 2(○) → 3(●)
    } else {
      const isPianoDrum = course_name && (
        course_name.includes('피아노') && course_name.includes('드럼')
      );
      maxStatus = isPianoDrum ? 5 : 3;
    }
    
    // 상태 순환
    const nextStatus = current_status === maxStatus ? 1 : current_status + 1;
    
    const sql = neon(process.env.DATABASE_URL!);
    
    // 특정 필드만 업데이트
    let updateSql = '';
    switch (field) {
      case 'exit_minute':
        updateSql = 'UPDATE student_attendance SET exit_minute_status = $1 WHERE attendance_num = $2';
        break;
      case 'director':
        updateSql = 'UPDATE student_attendance SET director_status = $1 WHERE attendance_num = $2';
        break;
      case 'theory':
        updateSql = 'UPDATE student_attendance SET theory_status = $1 WHERE attendance_num = $2';
        break;
      case 'teacher':
        updateSql = 'UPDATE student_attendance SET teacher_status = $1 WHERE attendance_num = $2';
        break;
      case 'vehicle':
        updateSql = 'UPDATE student_attendance SET vehicle_status = $1 WHERE attendance_num = $2';
        break;
      default:
        return NextResponse.json(
          { success: false, error: '잘못된 필드입니다.' },
          { status: 400 }
        );
    }
    
    await (sql as any).query(updateSql, [nextStatus, attendance_num]);
    
    return NextResponse.json({ 
      success: true, 
      nextStatus 
    });
    
  } catch (error) {
    console.error('드럼 상태 업데이트 오류:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '알 수 없는 오류' 
      },
      { status: 500 }
    );
  }
}

