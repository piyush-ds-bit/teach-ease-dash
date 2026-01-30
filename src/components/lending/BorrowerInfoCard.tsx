import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Pencil, Trash2, Phone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BorrowerPerson } from "@/lib/lendingCalculation";

interface BorrowerInfoCardProps {
  borrower: BorrowerPerson;
  onEdit: () => void;
  onDelete: () => void;
}

export function BorrowerInfoCard({ borrower, onEdit, onDelete }: BorrowerInfoCardProps) {
  const navigate = useNavigate();

  return (
    <Card className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="self-start"
          onClick={() => navigate('/lending')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <Avatar className="h-20 w-20 sm:h-24 sm:w-24">
            <AvatarImage src={borrower.profile_photo_url || undefined} />
            <AvatarFallback className="text-2xl">
              {borrower.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div>
                <h1 className="text-2xl font-bold">{borrower.name}</h1>
                {borrower.contact_number && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <Phone className="h-4 w-4" />
                    <span>{borrower.contact_number}</span>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={onEdit}>
                  <Pencil className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button variant="outline" size="sm" className="text-destructive" onClick={onDelete}>
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </div>
            </div>

            {borrower.notes && (
              <p className="text-sm text-muted-foreground mt-3 p-3 bg-muted/50 rounded-md">
                {borrower.notes}
              </p>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
