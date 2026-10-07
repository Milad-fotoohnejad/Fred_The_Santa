import { env } from 'cloudflare:workers';
import { isAdmin,json,sameOrigin } from '@/lib/server';
export async function POST(request:Request){
 if(!sameOrigin(request)||!await isAdmin())return json({error:'Access denied.'},403);
 if(!env.BUCKET)return json({error:'Photo storage is unavailable.'},503);
 if(Number(request.headers.get('content-length')||0)>9*1024*1024)return json({error:'Choose an image under 8 MB.'},413);
 const form=await request.formData();const file=form.get('photo');
 if(!(file instanceof File)||file.size>8*1024*1024)return json({error:'Choose an image under 8 MB.'},400);
 const bytes=new Uint8Array(await file.arrayBuffer());
 const jpeg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
 const png=[137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v);
 const webp=String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP';
 if(!jpeg&&!png&&!webp)return json({error:'Use a JPG, PNG, or WebP image.'},400);
 const type=jpeg?'image/jpeg':png?'image/png':'image/webp';const id=crypto.randomUUID();await env.BUCKET.put(id,bytes,{httpMetadata:{contentType:type}});return json({src:`/api/photos/${id}`});
}
