// 로컬 전용 SQL 매핑 레이어
require('dotenv').config({ path: './.env.development.local' }); 

export type NewMemberPayload = {
  loginId: string;       
  displayName: string;   
  roleCode: number;     
  passwordHash: string; 
};

export function buildNewMemberPayload(loginId: string, displayName: string, roleCode: number, passwordHash: string): NewMemberPayload {
  return { loginId, displayName, roleCode, passwordHash };
}

export async function insertMember(sql: any, payload: NewMemberPayload) {
  const { loginId, displayName, roleCode, passwordHash } = payload;
  const envSql = process.env.INSERT_MEMBER_SQL;
  if (envSql && envSql.trim().length > 0) {
    // neon v2: 값 자리표시자($1..) 사용 시 query 함수를 사용
    return (sql as any).query(envSql, [loginId, displayName, roleCode, passwordHash]);
  }
  throw new Error('INSERT_MEMBER_SQL 환경변수가 설정되지 않았습니다. 운영/개발 환경변수에 SQL을 등록해 주세요.');
}

export async function selectMemberByLoginId(sql: any, loginId: string) {
  const envSql = process.env.SELECT_MEMBER_BY_LOGINID_SQL;
  if (envSql && envSql.trim().length > 0) {
    const result = await (sql as any).query(envSql, [loginId.trim()]);
    return result;
  }
  throw new Error('SELECT_MEMBER_BY_LOGINID_SQL 환경변수가 설정되지 않았습니다. 운영/개발 환경변수에 SQL을 등록해 주세요.');
}


