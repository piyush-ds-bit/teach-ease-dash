import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Check, Pause, Play, Loader2, Link as LinkIcon, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export interface Teacher {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  phone: string | null;
  status: 'active' | 'suspended';
  created_at: string;
}

interface TeachersTableProps {
  teachers: Teacher[];
  onTeacherUpdated: () => void;
  onTeacherDeleted?: (userId: string) => void;
}

const FN_BASE = `https://pllnboggbgghjyunmwdp.supabase.co/functions/v1/teacher-management`;

export function TeachersTable({ teachers, onTeacherUpdated, onTeacherDeleted }: TeachersTableProps) {
  const { toast } = useToast();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Record<string, string>>({});
  const [deleteOpenId, setDeleteOpenId] = useState<string | null>(null);

  const handleStatusChange = async (teacher: Teacher, newStatus: 'active' | 'suspended') => {
    setLoadingId(teacher.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(`${FN_BASE}/update-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ teacher_user_id: teacher.user_id, status: newStatus }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to update status');

      toast({ title: "Status Updated", description: `${teacher.full_name} is now ${newStatus}` });
      onTeacherUpdated();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update status",
        variant: "destructive",
      });
    } finally {
      setLoadingId(null);
    }
  };

  const handleResendInvite = async (teacher: Teacher) => {
    setLoadingId(teacher.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(`${FN_BASE}/resend-invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ teacher_user_id: teacher.user_id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to generate invite link');

      await navigator.clipboard.writeText(result.invite_link);
      setCopiedId(teacher.id);
      setTimeout(() => setCopiedId(null), 2000);
      toast({
        title: "Invite Link Copied",
        description: `New invite link for ${teacher.full_name} copied to clipboard`,
      });
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate invite link",
        variant: "destructive",
      });
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = async (teacher: Teacher) => {
    setLoadingId(teacher.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(`${FN_BASE}/delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ teacher_user_id: teacher.user_id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to delete teacher');

      const summary = Object.entries(result.deleted_counts || {})
        .filter(([, n]) => Number(n) > 0)
        .map(([k, n]) => `${k}: ${n}`)
        .join(', ');

      toast({
        title: "Teacher Deleted",
        description: summary
          ? `${teacher.full_name} removed. (${summary})`
          : `${teacher.full_name} removed.`,
      });

      setDeleteOpenId(null);
      setDeleteConfirm((prev) => {
        const next = { ...prev };
        delete next[teacher.id];
        return next;
      });
      onTeacherDeleted?.(teacher.user_id);
      onTeacherUpdated();
    } catch (error: unknown) {
      toast({
        title: "Delete Failed",
        description: error instanceof Error ? error.message : "Could not delete teacher",
        variant: "destructive",
      });
    } finally {
      setLoadingId(null);
    }
  };

  if (teachers.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No teachers added yet.</p>
        <p className="text-sm">Click "Add Teacher" to invite your first teacher.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {teachers.map((teacher) => {
            const confirmText = deleteConfirm[teacher.id] ?? "";
            const canDelete = confirmText.trim() === teacher.full_name.trim();
            return (
              <TableRow key={teacher.id}>
                <TableCell className="font-medium">{teacher.full_name}</TableCell>
                <TableCell>{teacher.email}</TableCell>
                <TableCell>{teacher.phone || "-"}</TableCell>
                <TableCell>
                  <Badge
                    variant={teacher.status === 'active' ? 'default' : 'secondary'}
                    className={teacher.status === 'active'
                      ? 'bg-green-500/10 text-green-600 border-green-500/30'
                      : 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                    }
                  >
                    {teacher.status === 'active' ? 'Active' : 'Paused'}
                  </Badge>
                </TableCell>
                <TableCell>{new Date(teacher.created_at).toLocaleDateString()}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleResendInvite(teacher)}
                      disabled={loadingId === teacher.id}
                    >
                      {loadingId === teacher.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : copiedId === teacher.id ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <LinkIcon className="h-4 w-4" />
                      )}
                    </Button>

                    {teacher.status === 'active' ? (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="outline" className="text-amber-600" disabled={loadingId === teacher.id}>
                            <Pause className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Pause Teacher Account?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will prevent {teacher.full_name} from logging in.
                              Their data will be preserved. You can reactivate them later.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleStatusChange(teacher, 'suspended')}
                              className="bg-amber-600 hover:bg-amber-700"
                            >
                              Pause Account
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-600"
                        onClick={() => handleStatusChange(teacher, 'active')}
                        disabled={loadingId === teacher.id}
                      >
                        {loadingId === teacher.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                    )}

                    <AlertDialog
                      open={deleteOpenId === teacher.id}
                      onOpenChange={(open) => {
                        setDeleteOpenId(open ? teacher.id : null);
                        if (!open) {
                          setDeleteConfirm((prev) => {
                            const next = { ...prev };
                            delete next[teacher.id];
                            return next;
                          });
                        }
                      }}
                    >
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10"
                          disabled={loadingId === teacher.id}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Teacher Permanently?</AlertDialogTitle>
                          <AlertDialogDescription asChild>
                            <div className="space-y-3">
                              <p>
                                This will permanently delete <strong>{teacher.full_name}</strong>,
                                all their students, payments, ledger entries, homework, routines,
                                lending data and the login account. <strong>This cannot be undone.</strong>
                              </p>
                              <div className="space-y-1.5">
                                <Label htmlFor={`confirm-${teacher.id}`} className="text-foreground">
                                  Type <span className="font-mono font-semibold">{teacher.full_name}</span> to confirm:
                                </Label>
                                <Input
                                  id={`confirm-${teacher.id}`}
                                  value={confirmText}
                                  onChange={(e) =>
                                    setDeleteConfirm((prev) => ({ ...prev, [teacher.id]: e.target.value }))
                                  }
                                  placeholder={teacher.full_name}
                                  autoComplete="off"
                                />
                              </div>
                            </div>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel disabled={loadingId === teacher.id}>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={(e) => {
                              e.preventDefault();
                              if (canDelete) handleDelete(teacher);
                            }}
                            disabled={!canDelete || loadingId === teacher.id}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {loadingId === teacher.id ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Deleting...
                              </>
                            ) : (
                              "Delete Permanently"
                            )}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
