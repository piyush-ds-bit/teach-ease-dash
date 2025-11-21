import { supabase } from "@/integrations/supabase/client";

export const generateStudentId = async (): Promise<string> => {
  let isUnique = false;
  let loginId = "";
  
  while (!isUnique) {
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    loginId = `STU${randomNum}`;
    
    const { data } = await supabase
      .from("students")
      .select("login_id")
      .eq("login_id", loginId)
      .maybeSingle();
    
    if (!data) {
      isUnique = true;
    }
  }
  
  return loginId;
};

export const generateRandomPassword = (): string => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let password = "";
  for (let i = 0; i < 10; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

export const hashPassword = async (password: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
};

export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  const inputHash = await hashPassword(password);
  return inputHash === hash;
};

// Student session management (using localStorage)
interface StudentSession {
  studentId: string;
  loginId: string;
  name: string;
  timestamp: number;
}

export const setStudentSession = (studentId: string, loginId: string, name: string) => {
  localStorage.setItem("student_session", JSON.stringify({
    studentId,
    loginId,
    name,
    timestamp: Date.now()
  }));
  
  // Set current_setting for RLS
  localStorage.setItem("app.current_student_id", loginId);
};

export const getStudentSession = (): StudentSession | null => {
  const session = localStorage.getItem("student_session");
  if (!session) return null;
  
  const data = JSON.parse(session);
  // Session expires after 24 hours
  if (Date.now() - data.timestamp > 24 * 60 * 60 * 1000) {
    clearStudentSession();
    return null;
  }
  
  return data;
};

export const clearStudentSession = () => {
  localStorage.removeItem("student_session");
  localStorage.removeItem("app.current_student_id");
};
