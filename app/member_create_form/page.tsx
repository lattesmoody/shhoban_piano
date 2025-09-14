// 회원가입 (강사 추가 페이지)

'use client'; // useFormState, useFormStatus 훅을 사용하려면 클라이언트 컴포넌트여야 한다.

import { useActionState } from 'react'; 
import { useFormStatus } from 'react-dom';
import { registerUser } from '@/app/lib/process_member_create_form/actions'; // 회원가입을 처리할 서버 액션을 가져옴.

/**
 * 함수 이름: MemberCreateFormPage
 * 함수 역할: 회원가입(강사추가) 폼과 UI를 담당하는 컴포넌트
 */
export default function MemberCreateFormPage() {
  // registerUser 서버 액션의 결과(에러 메시지 등)를 상태로 관리.
  const [errorMessage, dispatch] = useActionState(registerUser, undefined);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-xl shadow-lg">
        <h1 className="text-3xl font-bold text-center text-gray-900">강사추가</h1>
        
        {/* form의 action에 서버 액션 함수를 연결. */}
        <form action={dispatch} className="space-y-4">
          <div>
            <label
              htmlFor="member_id"
              className="block text-sm font-medium text-gray-700"
            >
              아이디
            </label>
            <input
              id="member_id"
              type="text" 
              // pattern="[0-9]*" // 숫자만 입력 받도록 pattern 속성 추가
              name="member_id"
              placeholder="ID를 입력해 주세요. (12자 이내)"
              minLength={4}
              maxLength={12}
              required
              className="w-full px-3 py-2 mt-1 transition duration-150 ease-in-out border border-gray-300 rounded-md shadow-sm appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label
              htmlFor="member_pw"
              className="block text-sm font-medium text-gray-700"
            >
              비밀번호
            </label>
            <input
              id="member_pw"
              type="password"
              name="member_pw"
              placeholder="비밀번호"
              required
              minLength={4}
              className="w-full px-3 py-2 mt-1 transition duration-150 ease-in-out border border-gray-300 rounded-md shadow-sm appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          {/* 이름 필드 추가 */}
          <div>
            <label
              htmlFor="member_name"
              className="block text-sm font-medium text-gray-700"
            >
              이름
            </label>
            <input
              id="member_name"
              type="text"
              name="member_name"
              placeholder="이름을 입력하세요"
              required
              className="w-full px-3 py-2 mt-1 transition duration-150 ease-in-out border border-gray-300 rounded-md shadow-sm appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          {/* 강사구분 필드 추가 */}
          <div>
            <label
              htmlFor="member_code"
              className="block text-sm font-medium text-gray-700"
            >
              강사 구분
            </label>
            <input
              id="member_code"
              type="text"
              pattern="[0-9]*"
              name="member_code"
              placeholder="구분 번호 (예: 1,2,3)"
              required
              className="w-full px-3 py-2 mt-1 transition duration-150 ease-in-out border border-gray-300 rounded-md shadow-sm appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* 강사추가 버튼 (로딩 상태 표시 기능 포함) */}
          <MemberCreateButton />

          {/* 서버 액션 실패 시 에러 메시지 표시 */}
          {errorMessage && (
            <div
              className="flex items-center space-x-2 text-sm text-red-600"
              aria-live="polite"
              aria-atomic="true"
            >
              <p>{errorMessage}</p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

/**
 * 폼 제출 상태에 따라 로딩 상태를 표시하는 버튼 컴포넌트
 */
function MemberCreateButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full px-4 py-2 mt-4 font-semibold text-white transition duration-200 ease-in-out bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
    >
      {pending ? '추가 진행 중...' : '생성'}
    </button>
  );
}

