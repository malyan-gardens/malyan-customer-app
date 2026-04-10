import { createClient } from "@supabase/supabase-js";

export type { InventoryRow } from "./types";

const supabaseUrl = "https://pjhvbtmceaesxyoutgbr.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqaHZidG1jZWFlc3h5b3V0Z2JyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3MzAxODUsImV4cCI6MjA4ODMwNjE4NX0.L3V6xq1YQAhkKnq83jE43g9GQU1P6vrFzyQVPXKBWlA";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
