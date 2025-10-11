'use server';

import { neon } from '@neondatabase/serverless';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { upsertClassTimeSetting, ClassTimeSetting } from '../lib/sql/maps/classTimeQueries';

export async function saveClassTimeSettings(formData: FormData): Promise<void> {
  const sql = neon(process.env.DATABASE_URL!);

  const grades = ['유치부','초등부','중고등부','대회부','연주회부'];
  for (const g of grades) {
    const getNum = (name: string) => Number(formData.get(`${g}:${name}`) || 0);
    const setting: ClassTimeSetting = {
      grade_name: g,
      pt_piano: getNum('pt_piano'),
      pt_theory: getNum('pt_theory'),
      pd_piano: getNum('pd_piano'),
      pd_drum: getNum('pd_drum'),
      drum_only: getNum('drum_only'),
      piano_only: getNum('piano_only')
    };
    await upsertClassTimeSetting(sql, setting);
  }

  revalidatePath('/class_time_setup_form');
  redirect('/class_time_setup_form?updated=1');
}


