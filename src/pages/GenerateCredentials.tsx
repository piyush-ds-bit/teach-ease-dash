import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { generateStudentId, generateRandomPassword, generateCredentials as generateCredentialsApi } from "@/lib/studentAuth";
import { toast } from "@/hooks/use-toast";
import { Loader2, Copy, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface GeneratedCredential {
  studentId: string;
  name: string;
  loginId: string;
  password: string;
}

const GenerateCredentials = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [credentials, setCredentials] = useState<GeneratedCredential[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  const generateAllCredentials = async () => {
    setLoading(true);
    try {
      // Fetch all students
      const { data: students, error } = await supabase
        .from("students")
        .select("id, name, login_id, password_hash")
        .order("name");

      if (error) throw error;

      const newCredentials: GeneratedCredential[] = [];

      // Generate credentials for each student
      for (const student of students || []) {
        let loginId = student.login_id;
        const password = generateRandomPassword();

        // Generate unique login_id if not exists
        if (!loginId) {
          let isUnique = false;
          while (!isUnique) {
            loginId = await generateStudentId();
            const { data: existing } = await supabase
              .from("students")
              .select("login_id")
              .eq("login_id", loginId)
              .maybeSingle();
            
            if (!existing) {
              isUnique = true;
            }
          }

          // Update login_id in database
          await supabase
            .from("students")
            .update({ login_id: loginId })
            .eq("id", student.id);
        }

        // Generate credentials via edge function (bcrypt hashing)
        const result = await generateCredentialsApi(student.id, password);
        
        if (!result.success) {
          console.error(`Failed to set password for ${student.name}:`, result.error);
          // Continue with other students
        }

        newCredentials.push({
          studentId: student.id,
          name: student.name,
          loginId: loginId,
          password: password,
        });
      }

      setCredentials(newCredentials);
      toast({
        title: "Credentials Generated",
        description: `Generated credentials for ${newCredentials.length} students.`,
      });
    } catch (error) {
      console.error("Error generating credentials:", error);
      toast({
        title: "Error",
        description: "Failed to generate credentials. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyCredential = (loginId: string, password: string) => {
    const text = `Student ID: ${loginId}\nPassword: ${password}`;
    navigator.clipboard.writeText(text);
    setCopied(loginId);
    toast({
      title: "Copied to clipboard",
      description: "Student credentials have been copied.",
    });
    setTimeout(() => setCopied(null), 2000);
  };

  const copyAllCredentials = () => {
    const text = credentials
      .map((cred) => `${cred.name}\nStudent ID: ${cred.loginId}\nPassword: ${cred.password}\n`)
      .join("\n");
    navigator.clipboard.writeText(text);
    toast({
      title: "All Credentials Copied",
      description: "All student credentials have been copied to clipboard.",
    });
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Generate Student Credentials</h1>
            <p className="text-muted-foreground mt-2">
              Generate login credentials for all students who don't have them yet
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate("/dashboard")}>
            Back to Dashboard
          </Button>
        </div>

        {credentials.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Generate Credentials</CardTitle>
              <CardDescription>
                Click the button below to generate Student IDs and passwords for all students.
                The passwords will be securely hashed with bcrypt and stored in the database.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={generateAllCredentials} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generate All Credentials
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Generated Credentials</CardTitle>
                  <CardDescription>
                    Save these credentials and share them with the respective students.
                    Passwords are shown only once.
                  </CardDescription>
                </div>
                <Button onClick={copyAllCredentials}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student Name</TableHead>
                      <TableHead>Student ID</TableHead>
                      <TableHead>Password</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {credentials.map((cred) => (
                      <TableRow key={cred.studentId}>
                        <TableCell className="font-medium">{cred.name}</TableCell>
                        <TableCell>
                          <code className="bg-muted px-2 py-1 rounded text-sm">
                            {cred.loginId}
                          </code>
                        </TableCell>
                        <TableCell>
                          <code className="bg-muted px-2 py-1 rounded text-sm">
                            {cred.password}
                          </code>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyCredential(cred.loginId, cred.password)}
                          >
                            {copied === cred.loginId ? (
                              <>
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Copied
                              </>
                            ) : (
                              <>
                                <Copy className="h-4 w-4 mr-2" />
                                Copy
                              </>
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  ⚠️ <strong>Important:</strong> Make sure to save these credentials securely.
                  Students will need these to log in at /student-login
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default GenerateCredentials;