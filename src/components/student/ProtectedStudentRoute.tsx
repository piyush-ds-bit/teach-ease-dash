import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getStudentSession } from "@/lib/studentAuth";

export const ProtectedStudentRoute = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();

  useEffect(() => {
    const session = getStudentSession();
    if (!session) {
      navigate("/student-login");
    }
  }, [navigate]);

  const session = getStudentSession();
  if (!session) {
    return null;
  }

  return <>{children}</>;
};
