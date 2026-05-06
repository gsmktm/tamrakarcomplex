import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Trash2, MailOpen, Mail } from "lucide-react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { getErrorMessage } from "@/lib/utils";
import type { Tables } from "@/integrations/supabase/types";

type ContactMessage = Tables<"contact_messages">;

const ContactManager = () => {
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const queryClient = useQueryClient();

  const { data: messages, isLoading } = useQuery({
    queryKey: ["admin_contact_messages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_messages")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("contact_messages")
        .update({ is_read: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_contact_messages"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contact_messages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_contact_messages"] });
      toast.success("Message deleted");
      setSelectedMessage(null);
    },
    onError: (error: unknown) => {
      toast.error(`Error deleting message: ${getErrorMessage(error)}`);
    },
  });

  const handleView = (message: ContactMessage) => {
    setSelectedMessage(message);
    if (!message.is_read) {
      markAsReadMutation.mutate(message.id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Mail Box</h1>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]"></TableHead>
              <TableHead>Date</TableHead>
              <TableHead>From</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : messages?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24">
                  No messages found.
                </TableCell>
              </TableRow>
            ) : (
              messages?.map((msg) => (
                <TableRow 
                  key={msg.id} 
                  className={!msg.is_read ? "bg-muted/50 font-medium" : ""}
                  onClick={() => handleView(msg)}
                >
                  <TableCell>
                    {msg.is_read ? (
                      <MailOpen className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Mail className="h-4 w-4 text-blue-500" />
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {format(new Date(msg.created_at), "MMM d, HH:mm")}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{msg.name}</span>
                      <span className="text-xs text-muted-foreground">{msg.email}</span>
                    </div>
                  </TableCell>
                  <TableCell>{msg.subject}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:text-red-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm("Delete this message?")) {
                          deleteMutation.mutate(msg.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!selectedMessage} onOpenChange={(open) => !open && setSelectedMessage(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedMessage?.subject}</DialogTitle>
            <DialogDescription>
              From: {selectedMessage?.name} &lt;{selectedMessage?.email}&gt;
              <br />
              Received: {selectedMessage && format(new Date(selectedMessage.created_at), "PPP p")}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 p-4 bg-muted rounded-md whitespace-pre-wrap">
            {selectedMessage?.message}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" asChild>
              <a href={`mailto:${selectedMessage?.email}`}>Reply via Email</a>
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => deleteMutation.mutate(selectedMessage.id)}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContactManager;
