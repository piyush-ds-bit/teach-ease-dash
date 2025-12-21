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

// Student session management - now uses Supabase Auth session
interface StudentInfo {
  studentId: string;
  loginId: string;
  name: string;
}

// Store student info separately (non-sensitive, for UI display)
export const setStudentInfo = (studentId: string, loginId: string, name: string) => {
  localStorage.setItem("student_info", JSON.stringify({
    studentId,
    loginId,
    name,
  }));
};

export const getStudentInfo = (): StudentInfo | null => {
  const info = localStorage.getItem("student_info");
  if (!info) return null;
  return JSON.parse(info);
};

export const clearStudentInfo = () => {
  localStorage.removeItem("student_info");
};

// Check if current user is a student (has student metadata in Supabase Auth)
export const isStudentSession = async (): Promise<boolean> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return false;
  return session.user.user_metadata?.is_student === true;
};

// Get student session (combines Supabase Auth session with student info)
export const getStudentSession = (): StudentInfo | null => {
  return getStudentInfo();
};

// Set student session (called after successful login)
export const setStudentSession = (studentId: string, loginId: string, name: string) => {
  setStudentInfo(studentId, loginId, name);
};

// Clear student session
export const clearStudentSession = async () => {
  clearStudentInfo();
  await supabase.auth.signOut();
};

// Login student via edge function
export const loginStudent = async (loginId: string, password: string): Promise<{
  success: boolean;
  error?: string;
  student?: StudentInfo;
}> => {
  try {
    const response = await supabase.functions.invoke("student-auth/login", {
      body: { login_id: loginId, password },
    });

    if (response.error) {
      return { success: false, error: response.error.message || "Login failed" };
    }

    const data = response.data;

    if (!data.success) {
      return { success: false, error: data.error || "Invalid credentials" };
    }

    // Set Supabase Auth session
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });

    if (sessionError) {
      console.error("Session error:", sessionError);
      return { success: false, error: "Failed to establish session" };
    }

    // Store student info for UI
    setStudentInfo(data.student.id, data.student.login_id, data.student.name);

    return {
      success: true,
      student: {
        studentId: data.student.id,
        loginId: data.student.login_id,
        name: data.student.name,
      },
    };
  } catch (error) {
    console.error("Login error:", error);
    return { success: false, error: "An error occurred during login" };
  }
};

// Generate credentials for a student via edge function
export const generateCredentials = async (studentId: string, password: string): Promise<{
  success: boolean;
  error?: string;
}> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    const response = await supabase.functions.invoke("student-auth/generate-credentials", {
      body: { student_id: studentId, password },
      headers: session ? { Authorization: `Bearer ${session.access_token}` } : undefined,
    });

    if (response.error) {
      return { success: false, error: response.error.message || "Failed to generate credentials" };
    }

    return { success: response.data?.success || false, error: response.data?.error };
  } catch (error) {
    console.error("Generate credentials error:", error);
    return { success: false, error: "An error occurred" };
  }
};

// Reset password for a student via edge function
export const resetStudentPassword = async (studentId: string, newPassword: string): Promise<{
  success: boolean;
  error?: string;
}> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    const response = await supabase.functions.invoke("student-auth/reset-password", {
      body: { student_id: studentId, new_password: newPassword },
      headers: session ? { Authorization: `Bearer ${session.access_token}` } : undefined,
    });

    if (response.error) {
      return { success: false, error: response.error.message || "Failed to reset password" };
    }

    return { success: response.data?.success || false, error: response.data?.error };
  } catch (error) {
    console.error("Reset password error:", error);
    return { success: false, error: "An error occurred" };
  }
};