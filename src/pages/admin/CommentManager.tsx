import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

type CommentRow = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  article: { title: string; slug: string } | null;
};

export default function CommentManager() {
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: comments, isLoading, error: commentsError } = useQuery({
    queryKey: ["comments", "admin"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("comments")
          .select("id, content, created_at, user_id, article:articles(title, slug)")
          .order("created_at", { ascending: false });
        if (error) throw error;
        return (data ?? []) as CommentRow[];
      } catch (err) {
        handleSupabaseError(err, "CommentManager: Failed to fetch comments");
        return [];
      }
    },
    retry: 1,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("comments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", "admin"] });
      toast.success("Comment deleted");
    },
    onError: (error) => {
      toast.error(`Failed to delete comment: ${error.message}`);
    },
  });

  const filteredComments = comments?.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.content.toLowerCase().includes(q) ||
      (c.article?.title || "").toLowerCase().includes(q) ||
      c.user_id.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Comments</h1>
      </div>

      <div className="flex items-center space-x-2">
        <Search className="h-4 w-4 text-gray-500" />
        <Input
          placeholder="Search comments, article title, or user id..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Article</TableHead>
              <TableHead>Comment</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Date</TableHead>
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
            ) : filteredComments?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24">
                  No comments found.
                </TableCell>
              </TableRow>
            ) : (
              filteredComments?.map((comment) => (
                <TableRow key={comment.id}>
                  <TableCell className="max-w-[260px] truncate" title={comment.article?.title || ""}>
                    {comment.article?.slug ? (
                      <Link to={`/stores/article/${comment.article.slug}`} target="_blank" rel="noreferrer" className="hover:underline">
                        {comment.article.title}
                      </Link>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell className="max-w-[520px] truncate" title={comment.content}>
                    {comment.content}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{comment.user_id}</TableCell>
                  <TableCell>{new Date(comment.created_at).toLocaleString()}</TableCell>
                  <TableCell className="text-right space-x-2">
                    {comment.article?.slug ? (
                      <Link to={`/stores/article/${comment.article.slug}`} target="_blank" rel="noreferrer">
                        <Button variant="ghost" size="icon">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </Link>
                    ) : null}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:text-red-600"
                      onClick={() => {
                        if (confirm("Are you sure you want to delete this comment?")) {
                          deleteMutation.mutate(comment.id);
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
    </div>
  );
}
