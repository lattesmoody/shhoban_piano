// 실행 결과: 새로운 사용자가 생성되었습니다. ID: test
'use server'; // 이 파일의 모든 함수를 서버에서만 실행되는 서버 액션.
import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcrypt';
import { redirect } from 'next/navigation';
import { z } from 'zod'; // 데이터 유효성 검사를 위한 Zod 라이브러리
import { insertMember, buildNewMemberPayload } from '@/app/lib/sql/maps/memberQueries';

require('dotenv').config({ path: './.env.development.local' }); 

// Zod를 사용해 "강사구분" 폼 데이터의 스키마를 정의하고 유효성을 검사
const SignupFormSchema = z.object({
  member_id: z
    .string()
    .trim()
    .min(4, { message: '아이디는 최소 4자 이상이어야 ' })
    .max(12, { message: '아이디는 최대 12자까지 입력 가능' }),
  member_pw: z.string().min(4, { message: '비밀번호는 최소 4자 이상이어야 ' }),
  member_name: z.string().min(1, { message: '이름을 입력해주세요.' }),
  member_code: z.string().regex(/^[0-9]+$/, { message: '강사 구분은 숫자만 입력 가능' }),
});

// 로그인 폼 스키마는 별도 파일(authenticate.ts)에서 사용

/**
 * 신규 사용자를 등록하는 서버 액션 함수
 * @param prevState - useFormState 훅에서 전달되는 이전 상태
 * @param formData - 제출된 폼 데이터
 * @returns 에러 메시지 문자열 또는 undefined
 */
export async function registerUser(
  prevState: string | undefined,
  formData: FormData,
) {
  // 1. 폼 데이터의 유효성을 검사
  const validatedFields = SignupFormSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );

  // 유효성 검사 실패 시, 에러 메시지를 합쳐서 반환
  if (!validatedFields.success) {
    return validatedFields.error.issues.map((e) => e.message).join(', ');
  }
  
  const { member_id, member_pw, member_name, member_code } = validatedFields.data;

  try {
    const sql = neon(process.env.DATABASE_URL!);
    // 비밀번호 해싱 옵션을 환경 변수에서 가져오도록 수정
    // process.env 값은 문자열이므로 parseInt로 숫자로 변환, 값이 없을 경우 별도로 설정한 값으로.
    const saltRounds = parseInt(process.env.PASSWORD_HASH_OPTION || '8');
    
    // 2. 비밀번호 암호화(해싱)
    const hashedPassword = await bcrypt.hash(member_pw, saltRounds);

    // 3. 데이터베이스에 사용자 정보를 삽입 (쿼리 매핑 파일 사용)
    await insertMember(
      sql as any,
      buildNewMemberPayload(
        member_id,
        member_name,
        Number(member_code),
        hashedPassword,
      ),
    );

    // 성공 로그(민감한 식별자 노출 방지)
    //console.log('새로운 사용자가 생성되었습니다.');

  } catch (error: any) {
    // 4. 에러 처리 (특히, 아이디 중복 에러)
    if (error.code === '23505') { // Postgresql의 unique_violation 에러 코드
      return '이미 사용 중인 아이디입니다.';
    }
    // 내부 로그만 남기고 상세 정보는 외부에 노출하지 않음
    console.error('강사추가 에러');
    return '강사추가 중 오류가 발생했습니다. 다시 시도해 주세요.';
  }

  // 5. 성공 시 강사 관리 페이지로 리다이렉트
  redirect('/member_manage'); 
}

/**
 * 기존 사용자를 인증하는 서버 액션 함수 (참고용으로 남겨둠)
 */
// 로그인 관련 서버 액션은 authenticate.ts로 분리

