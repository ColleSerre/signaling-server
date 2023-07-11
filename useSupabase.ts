import { createClient } from "@supabase/supabase-js";

// Create a single supabase client for interacting with your database

const key = process.env.SUPABASE_PUBLIC_ANON ?? "";
console.log(key);

const supabase = createClient(
  "https://ucjolalmoughwxjvuxkn.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjam9sYWxtb3VnaHd4anZ1eGtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE2ODQ4MzgzMDUsImV4cCI6MjAwMDQxNDMwNX0.qguXR5AdVqU7qBRtlirHROPSoZ7XMaY824e2b7WcuNo",
  {
    auth: {
      persistSession: false,
    },
  }
);

export default supabase;

// export default supabase;
