// 댓글 관련 SQL 매핑 계층 (DB 컬럼명을 도메인 파라미터로 은닉)

export type NewCommentPayload = {
  content: string; // DB 컬럼 은닉: comments.comment
};

export async function insertComment(sql: any, payload: NewCommentPayload) {
  const { content } = payload;
  return sql`INSERT INTO comments (comment) VALUES (${content})`;
}


