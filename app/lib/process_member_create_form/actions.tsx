// 실행 결과: 새로운 사용자가 생성되었습니다. ID: test
'use server'; // 이 파일의 모든 함수를 서버에서만 실행되는 서버 액션.

import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcrypt';
import { redirect } from 'next/navigation';
import { z } from 'zod'; // 데이터 유효성 검사를 위한 Zod 라이브러리

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

    // 3. 데이터베이스에 사용자 정보를 삽입
    await sql`
      INSERT INTO members (member_id, member_name,member_code,member_pw) 
      VALUES (${member_id}, ${member_name}, ${Number(member_code)}, ${hashedPassword})
    `;

    console.log(`새로운 사용자가 생성되었습니다. ID: ${member_id}`);

  } catch (error: any) {
    // 4. 에러 처리 (특히, 아이디 중복 에러)
    if (error.code === '23505') { // Postgresql의 unique_violation 에러 코드
      return '이미 사용 중인 아이디입니다.';
    }
    console.error('강사추가 에러:', error);
    return '강사추가 중 오류가 발생했습니다. 다시 시도해 주세요.';
  }

  // 5. 성공 시 강사 관리 페이지로 리다이렉트
  redirect('/member_manage'); 
}

/**
 * 기존 사용자를 인증하는 서버 액션 함수 (참고용으로 남겨둠)
 */
export async function authenticate(
  prevState: string | undefined,
  formData: FormData,
) {
  // ... (기존 로그인 로직)
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const id = formData.get('id') as string;
    const password = formData.get('password') as string;

    /*
      sql 함수에 제네릭 타입<T>을 직접 전달할 수 없어 발생하는 TypeScript 오류 수정 필요
      sql 템플릿 리터럴 함수의 반환 타입을 지정하려면, 
      함수를 호출한 결과에 as 키워드를 사용하여 타입을 단언(assertion)해야함
      
      변경 전: const userResult = await sql<{ password_hash: string }>`
    */
    const userResult = (await sql`
      SELECT member_pw FROM members WHERE member_id = ${Number(id)}
    `) as { password_hash: string }[];


    if (userResult.length === 0) {
      return '아이디 또는 비밀번호가 올바르지 않습니다.';
    }
    const user = userResult[0];
    const passwordsMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordsMatch) {
      return '아이디 또는 비밀번호가 올바르지 않습니다.';
    }
    console.log(`로그인 성공. ID: ${id}`);
  } catch (error) {
    if (error instanceof Error) {
        console.error(error);
        return '로그인 중 오류가 발생했습니다. 다시 시도해 주세요.';
    }
    return '알 수 없는 오류가 발생했습니다.';
  }
  redirect('/dashboard');
}

