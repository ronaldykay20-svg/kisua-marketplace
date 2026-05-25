const R2_ENDPOINT = import.meta.env.VITE_R2_ENDPOINT;
const R2_ACCESS_KEY = import.meta.env.VITE_R2_ACCESS_KEY_ID;
const R2_SECRET_KEY = import.meta.env.VITE_R2_SECRET_ACCESS_KEY;
const R2_BUCKET = import.meta.env.VITE_R2_BUCKET_NAME;
export const R2_PUBLIC_URL = import.meta.env.VITE_R2_PUBLIC_URL;

export async function uploadToR2(file: File, folder: string = 'produtos'): Promise<string> {
  const fileName = `${folder}/${Date.now()}-${file.name}`;
  
  const response = await fetch(`${R2_ENDPOINT}/${R2_BUCKET}/${fileName}`, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type,
      'x-amz-access-key-id': R2_ACCESS_KEY,
      'x-amz-secret-access-key': R2_SECRET_KEY,
    },
    body: file,
  });

  if (!response.ok) throw new Error('Falha no upload');
  
  return `${R2_PUBLIC_URL}/${fileName}`;
}
