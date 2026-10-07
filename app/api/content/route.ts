import { readContent,json } from '@/lib/server';
export async function GET(){return json(await readContent());}
