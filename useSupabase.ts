import { createClient } from "@supabase/supabase-js";

// Create a single supabase client for interacting with your database

const key = process.env.SUPABASE_PUBLIC_ANON ?? "";
console.log(key);

const supabase = createClient("https://ucjolalmoughwxjvuxkn.supabase.co", key, {
  auth: {
    persistSession: false,
  },
});

export default supabase;

// export default supabase;
