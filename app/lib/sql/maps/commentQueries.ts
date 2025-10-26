// 댓글 관련 SQL 매핑 계층 (DB 컬럼명을 도메인 파라미터로 은닉)

function normalizePlaceholders(raw: string | undefined): string {
  const input = (raw || '').trim();
  if (!input) return '';
  let normalized = input.replace(/\\\$(\d+)/g, (_m, d) => `$${d}`);
  normalized = normalized.replace(/`(\$\d+)/g, (_m, g1) => g1);
  return normalized;
}

export type NewCommentPayload = {
  content: string; // DB 컬럼 은닉: comments.comment
};

export async function insertComment(sql: any, payload: NewCommentPayload) {
  const { content } = payload;
  const envSql = normalizePlaceholders(process.env.INSERT_COMMENT_SQL);
  if (!envSql) {
    throw new Error('INSERT_COMMENT_SQL 환경변수가 설정되지 않았습니다.');
  }
  return (sql as any).query(envSql, [content]);
}


