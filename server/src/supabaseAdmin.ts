import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.SUPABASE_ANON_KEY;

if (!url || !serviceKey || !anonKey) {
  throw new Error(
    "SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY ve SUPABASE_ANON_KEY ortam değişkenleri gerekli"
  );
}

// Servis rolü istemcisi: RLS'i atlar. Yalnızca sunucu tarafında (Storage, admin işlemleri) kullanılır.
export const supabaseAdmin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Anon istemci: yalnızca istemciden gelen access token'ı doğrulamak için kullanılır.
export const supabaseAuth = createClient(url, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export const COVERS_BUCKET = "covers";
