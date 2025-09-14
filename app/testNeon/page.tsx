// File: app/page.tsx
import { neon } from '@neondatabase/serverless';
import { insertComment, NewCommentPayload } from '@/app/lib/sql/maps/commentQueries';

export default function Page() {
  async function create(formData: FormData) {
    'use server';
    // Connect to the Neon database
    const sql = neon(`${process.env.DATABASE_URL}`);
    const comment = String(formData.get('comment') || '');
    const payload: NewCommentPayload = { content: comment };
    await insertComment(sql as any, payload);
  }

  return (
    <form action={create}>
      <input type="text" placeholder="write a comment" name="comment" />
      <button type="submit">Submit</button>
    </form>
  );
}