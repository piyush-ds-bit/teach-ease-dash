import { useEffect, useState, useCallback } from "react";
import { LogOut, UserCog } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { EditTeacherProfileDialog } from "./EditTeacherProfileDialog";
import { Skeleton } from "@/components/ui/skeleton";

type TeacherRow = {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  profile_photo_url: string | null;
};

const getInitials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("") || "T";

export const TeacherProfileMenu = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [teacher, setTeacher] = useState<TeacherRow | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const buildFallbackTeacher = useCallback((user: NonNullable<Awaited<ReturnType<typeof supabase.auth.getUser>>["data"]["user"]>) => ({
    id: "",
    user_id: user.id,
    full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "Teacher",
    email: user.email || "",
    profile_photo_url: null,
  }), []);

  const createMissingTeacherProfile = useCallback(async (
    fallback: TeacherRow,
  ): Promise<TeacherRow | null> => {
    if (!fallback.email) return null;

    const { data, error } = await supabase
      .from("teachers")
      .insert({
        user_id: fallback.user_id,
        full_name: fallback.full_name,
        email: fallback.email,
        created_by: fallback.user_id,
        status: "active",
      })
      .select("id, user_id, full_name, email, profile_photo_url")
      .single();

    if (error || !data) {
      console.error("Unable to create teacher profile", error);
      return null;
    }

    return data as TeacherRow;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setLoading(false);
      return;
    }
    const fallbackTeacher = buildFallbackTeacher(auth.user);
    const { data, error } = await supabase
      .from("teachers")
      .select("id, user_id, full_name, email, profile_photo_url")
      .eq("user_id", auth.user.id)
      .maybeSingle();
    const teacherRow = data ? (data as TeacherRow) : await createMissingTeacherProfile(fallbackTeacher);

    if (error || !teacherRow) {
      if (error) {
        toast({
          title: "Profile unavailable",
          description: error.message,
          variant: "destructive",
        });
      }
      setTeacher(fallbackTeacher);
      setSignedUrl(null);
      setLoading(false);
      return;
    }
    setTeacher(teacherRow);
    if (teacherRow.profile_photo_url) {
      const { data: signed } = await supabase.storage
        .from("teacher-profiles")
        .createSignedUrl(teacherRow.profile_photo_url, 60 * 60 * 24 * 7);
      setSignedUrl(signed?.signedUrl ?? null);
    } else {
      setSignedUrl(null);
    }
    setLoading(false);
  }, [buildFallbackTeacher, createMissingTeacherProfile, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleLogout = async () => {
    setLoggingOut(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setLoggingOut(false);
      return;
    }
    navigate("/auth");
  };

  if (loading) return <Skeleton className="h-10 w-10 rounded-full" />;
  if (!teacher) return null;

  const initials = getInitials(teacher.full_name);
  const canEditProfile = Boolean(teacher.id);
  const openEditProfile = () => {
    setMenuOpen(false);
    window.requestAnimationFrame(() => setEditOpen(true));
  };

  return (
    <>
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Open profile menu"
            className="rounded-full ring-1 ring-border hover:ring-primary/40 transition-shadow shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Avatar className="h-10 w-10">
              {signedUrl ? (
                <AvatarImage
                  src={signedUrl}
                  alt={teacher.full_name}
                  onError={() => setSignedUrl(null)}
                />
              ) : null}
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          sideOffset={10}
          className="w-72 p-0 overflow-hidden border-border/60 bg-background/95 backdrop-blur-xl shadow-xl"
        >
          <div className="flex flex-col items-center gap-2 px-4 pt-5 pb-4 bg-gradient-to-b from-primary/10 to-transparent">
            <Avatar className="h-16 w-16 ring-2 ring-background shadow-md">
              {signedUrl ? <AvatarImage src={signedUrl} alt={teacher.full_name} /> : null}
              <AvatarFallback className="text-lg bg-primary/15 text-primary font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="text-center min-w-0 w-full">
              <p className="font-semibold leading-tight truncate">{teacher.full_name}</p>
              <p className="text-xs text-muted-foreground truncate">{teacher.email}</p>
            </div>
          </div>
          <DropdownMenuSeparator className="my-0" />
          <div className="p-1">
            <DropdownMenuItem
              onSelect={(event) => {
                event.preventDefault();
                if (canEditProfile) openEditProfile();
              }}
              className="cursor-pointer rounded-md font-medium text-foreground hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground data-[disabled]:cursor-not-allowed"
              disabled={!canEditProfile}
            >
              <UserCog className="h-4 w-4 mr-2" />
              Edit Profile
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => {
                setMenuOpen(false);
                window.requestAnimationFrame(() => setLogoutOpen(true));
              }}
              className="cursor-pointer text-destructive focus:text-destructive"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </DropdownMenuItem>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {teacher.id && (
        <EditTeacherProfileDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          teacherId={teacher.id}
          userId={teacher.user_id}
          fullName={teacher.full_name}
          email={teacher.email}
          currentPhotoPath={teacher.profile_photo_url}
          currentPhotoUrl={signedUrl}
          initials={initials}
          onSaved={load}
        />
      )}

      <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Logout</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to logout?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout} disabled={loggingOut}>
              {loggingOut ? "Logging out..." : "Logout"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
