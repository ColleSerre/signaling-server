"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
var supabase_js_1 = require("@supabase/supabase-js");
// Create a single supabase client for interacting with your database
var key = (_a = process.env.SUPABASE_PUBLIC_ANON) !== null && _a !== void 0 ? _a : "";
console.log(key);
var supabase = (0, supabase_js_1.createClient)("https://ucjolalmoughwxjvuxkn.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjam9sYWxtb3VnaHd4anZ1eGtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE2ODQ4MzgzMDUsImV4cCI6MjAwMDQxNDMwNX0.qguXR5AdVqU7qBRtlirHROPSoZ7XMaY824e2b7WcuNo", {
    auth: {
        persistSession: false,
    },
});
exports.default = supabase;
