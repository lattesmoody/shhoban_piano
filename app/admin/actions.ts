'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function logoutAction() {
  const jar = await cookies();
  jar.delete('auth_token');
  redirect('/member_login');
}


