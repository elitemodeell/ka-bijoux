import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabaseAdmin = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

export async function uploadToStorage(
  bucket: string,
  path: string,
  file: File,
): Promise<string> {
  const bytes = Buffer.from(await file.arrayBuffer());

  const { error } = await supabaseAdmin.storage
    .from(bucket)
    .upload(path, bytes, {
      contentType: file.type,
      upsert: true,
    });

  if (error) throw new Error(error.message);

  const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
