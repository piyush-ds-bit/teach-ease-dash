import { supabase } from "@/integrations/supabase/client";

type StudentWithDOB = {
  id: string;
  name: string;
  class: string;
  date_of_birth: string;
  profile_photo_url: string | null;
};

export type BirthdayStudent = StudentWithDOB & {
  age: number;
  daysUntil: number;
};

/**
 * Get students whose birthday is today
 */
export async function getTodaysBirthdays(): Promise<BirthdayStudent[]> {
  const today = new Date();
  const day = today.getDate();
  const month = today.getMonth() + 1;

  const { data: students } = await supabase
    .from("students")
    .select("id, name, class, date_of_birth, profile_photo_url")
    .not("date_of_birth", "is", null)
    .eq("is_active", true);

  if (!students) return [];

  return (students as StudentWithDOB[])
    .filter((s) => {
      const dob = new Date(s.date_of_birth);
      return dob.getDate() === day && dob.getMonth() + 1 === month;
    })
    .map((s) => ({
      ...s,
      age: getAge(s.date_of_birth),
      daysUntil: 0,
    }));
}

/**
 * Get students whose birthday falls within the next `days` days (excluding today)
 */
export async function getUpcomingBirthdays(days = 7): Promise<BirthdayStudent[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data: students } = await supabase
    .from("students")
    .select("id, name, class, date_of_birth, profile_photo_url")
    .not("date_of_birth", "is", null)
    .eq("is_active", true);

  if (!students) return [];

  const results: BirthdayStudent[] = [];

  for (const s of students as StudentWithDOB[]) {
    const daysUntil = getDaysUntilBirthday(s.date_of_birth);
    if (daysUntil > 0 && daysUntil <= days) {
      results.push({
        ...s,
        age: getAge(s.date_of_birth) + (daysUntil > 0 ? 1 : 0), // age they'll turn
        daysUntil,
      });
    }
  }

  return results.sort((a, b) => a.daysUntil - b.daysUntil);
}

/**
 * Check plant donation status for a student in a given year
 */
export async function getPlantStatus(
  studentId: string,
  year: number
): Promise<{ donated: boolean; donationDate: string | null }> {
  const { data } = await supabase
    .from("plant_donations")
    .select("donation_date")
    .eq("student_id", studentId)
    .eq("year", year)
    .maybeSingle();

  return {
    donated: !!data,
    donationDate: data?.donation_date ?? null,
  };
}

/**
 * Record a plant donation for a student
 */
export async function recordPlantDonation(
  studentId: string,
  year: number,
  donationDate: string,
  teacherId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.from("plant_donations").insert({
    student_id: studentId,
    year,
    donation_date: donationDate,
    teacher_id: teacherId,
  });

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "Plant already donated for this year" };
    }
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Delete a plant donation record
 */
export async function deletePlantDonation(donationId: string): Promise<boolean> {
  const { error } = await supabase
    .from("plant_donations")
    .delete()
    .eq("id", donationId);
  return !error;
}

/**
 * Get all plant donations for a student
 */
export async function getPlantDonationHistory(
  studentId: string
): Promise<{ id: string; donation_date: string; year: number; created_at: string }[]> {
  const { data } = await supabase
    .from("plant_donations")
    .select("id, donation_date, year, created_at")
    .eq("student_id", studentId)
    .order("year", { ascending: false });

  return data || [];
}

// --- Helpers ---

function getAge(dob: string): number {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

function getDaysUntilBirthday(dob: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const birth = new Date(dob);
  const nextBirthday = new Date(today.getFullYear(), birth.getMonth(), birth.getDate());
  if (nextBirthday < today) {
    nextBirthday.setFullYear(today.getFullYear() + 1);
  }
  // If it's today, return 0
  if (nextBirthday.getTime() === today.getTime()) return 0;
  return Math.ceil((nextBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}
