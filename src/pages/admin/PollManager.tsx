import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { handleSupabaseError } from "@/lib/supabaseErrorHandler";
import { POLLS_COLUMNS } from "@/lib/supabaseColumnMaps";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Trash2, Search, BarChart3, RotateCcw } from "lucide-react";

type PollOption = { text: string };

type PollRow = {
  id: string;
  question: string;
  options: PollOption[];
  end_date: string | null;
  active: boolean | null;
  total_votes: number | null;
  created_at: string;
};

type PollFormValues = {
  question: string;
  end_date: string;
  active: boolean;
  options: PollOption[];
};

function formatDatetimeLocal(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
    date.getMinutes(),
  )}`;
}

function validateOptions(options: PollOption[]) {
  const normalized = options.map((o) => ({ text: (o.text || "").trim() })).filter((o) => o.text.length > 0);
  const unique = Array.from(new Set(normalized.map((o) => o.text))).map((text) => ({ text }));
  return unique;
}

const PollManager = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [isOpen, setIsOpen] = useState(false);
  const [isResultsOpen, setIsResultsOpen] = useState(false);
  const [editingPoll, setEditingPoll] = useState<PollRow | null>(null);
  const [selectedPollForResults, setSelectedPollForResults] = useState<PollRow | null>(null);

  const [form, setForm] = useState<PollFormValues>({
    question: "",
    end_date: "",
    active: true,
    options: [{ text: "" }, { text: "" }],
  });

  const { data: polls, isLoading, error: pollsError } = useQuery({
    queryKey: ["polls", "admin"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.from("polls").select(POLLS_COLUMNS.join(",")).order("created_at", { ascending: false });
        if (error) throw error;
        return (data ?? []) as PollRow[];
      } catch (err) {
        handleSupabaseError(err, "PollManager: Failed to fetch polls");
        return [];
      }
    },
    retry: 1,
  });

  const filteredPolls = useMemo(() => {
    const items = polls ?? [];
    return items.filter((p) => {
      const matchesSearch = p.question.toLowerCase().includes(search.toLowerCase());
      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "active"
            ? p.active === true
            : p.active !== true;
      return matchesSearch && matchesStatus;
    });
  }, [polls, search, statusFilter]);

  const resultsQuery = useQuery({
    queryKey: ["poll-results", selectedPollForResults?.id],
    queryFn: async () => {
      if (!selectedPollForResults?.id) return [];
      const { data, error } = await supabase.rpc("get_poll_results", { p_poll_id: selectedPollForResults.id });
      if (error) throw error;
      return (data ?? []) as { option_index: number; vote_count: number }[];
    },
    enabled: !!selectedPollForResults?.id && isResultsOpen,
  });

  const createOrUpdateMutation = useMutation({
    mutationFn: async (values: PollFormValues) => {
      const options = validateOptions(values.options);
      if (options.length < 2) {
        throw new Error("Poll must have at least 2 options.");
      }

      const endDateIso = values.end_date ? new Date(values.end_date).toISOString() : null;

      if (values.active) {
        let deactivateQuery = supabase.from("polls").update({ active: false }).eq("active", true);
        if (editingPoll?.id) {
          deactivateQuery = deactivateQuery.neq("id", editingPoll.id);
        }
        const { error } = await deactivateQuery;
        if (error) throw error;
      }

      if (editingPoll) {
        const { error } = await supabase
          .from("polls")
          .update({
            question: values.question,
            options,
            end_date: endDateIso,
            active: values.active,
          })
          .eq("id", editingPoll.id);
        if (error) throw error;
        return { mode: "update" as const };
      }

      const { error } = await supabase.from("polls").insert({
        question: values.question,
        options,
        end_date: endDateIso,
        active: values.active,
        total_votes: 0,
      });
      if (error) throw error;
      return { mode: "create" as const };
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["polls", "admin"] });
      setIsOpen(false);
      setEditingPoll(null);
      setForm({ question: "", end_date: "", active: true, options: [{ text: "" }, { text: "" }] });
      toast.success(res.mode === "create" ? "Poll created successfully" : "Poll updated successfully");
    },
    onError: (error) => {
      toast.error(`Failed to save poll: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (pollId: string) => {
      const { error } = await supabase.from("polls").delete().eq("id", pollId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["polls", "admin"] });
      toast.success("Poll deleted successfully");
    },
    onError: (error) => {
      toast.error(`Failed to delete poll: ${error.message}`);
    },
  });

  const resetVotesMutation = useMutation({
    mutationFn: async (pollId: string) => {
      const { error: deleteError } = await supabase.from("poll_votes").delete().eq("poll_id", pollId);
      if (deleteError) throw deleteError;

      const { error: updateError } = await supabase.from("polls").update({ total_votes: 0 }).eq("id", pollId);
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      toast.success("Votes reset successfully");
      queryClient.invalidateQueries({ queryKey: ["polls", "admin"] });
      queryClient.invalidateQueries({ queryKey: ["poll-results"] });
    },
    onError: (error) => {
      toast.error(`Failed to reset votes: ${error.message}`);
    },
  });

  const handleEdit = (poll: PollRow) => {
    setEditingPoll(poll);
    setForm({
      question: poll.question,
      end_date: formatDatetimeLocal(poll.end_date),
      active: poll.active === true,
      options: Array.isArray(poll.options) && poll.options.length > 0 ? poll.options : [{ text: "" }, { text: "" }],
    });
    setIsOpen(true);
  };

  const openCreate = () => {
    setEditingPoll(null);
    setForm({ question: "", end_date: "", active: true, options: [{ text: "" }, { text: "" }] });
    setIsOpen(true);
  };

  const openResults = (poll: PollRow) => {
    setSelectedPollForResults(poll);
    setIsResultsOpen(true);
  };

  const totalVotesForResults = useMemo(() => {
    const results = resultsQuery.data ?? [];
    return results.reduce((sum, r) => sum + (r.vote_count ?? 0), 0);
  }, [resultsQuery.data]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Polls</h1>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" /> Create Poll
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingPoll ? "Edit Poll" : "Create Poll"}</DialogTitle>
            </DialogHeader>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                createOrUpdateMutation.mutate(form);
              }}
            >
              <div className="grid gap-2">
                <Label htmlFor="question">Question</Label>
                <Input
                  id="question"
                  value={form.question}
                  onChange={(e) => setForm((prev) => ({ ...prev, question: e.target.value }))}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="end_date">End Date (optional)</Label>
                <Input
                  id="end_date"
                  type="datetime-local"
                  value={form.end_date}
                  onChange={(e) => setForm((prev) => ({ ...prev, end_date: e.target.value }))}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="active"
                  checked={form.active}
                  onCheckedChange={(checked) => setForm((prev) => ({ ...prev, active: checked === true }))}
                />
                <Label htmlFor="active">Active (only one active poll)</Label>
              </div>

              <div className="space-y-2">
                <Label>Options</Label>
                <div className="space-y-2">
                  {form.options.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input
                        value={opt.text}
                        onChange={(e) => {
                          const text = e.target.value;
                          setForm((prev) => ({
                            ...prev,
                            options: prev.options.map((o, i) => (i === idx ? { ...o, text } : o)),
                          }));
                        }}
                        placeholder={`Option ${idx + 1}`}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        disabled={form.options.length <= 2}
                        onClick={() => {
                          setForm((prev) => ({ ...prev, options: prev.options.filter((_, i) => i !== idx) }));
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setForm((prev) => ({ ...prev, options: [...prev.options, { text: "" }] }))}
                >
                  Add Option
                </Button>
              </div>

              <Button className="w-full" type="submit" disabled={createOrUpdateMutation.isPending}>
                {createOrUpdateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {editingPoll ? "Update" : "Create"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center space-x-2">
          <Search className="h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search polls..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant={statusFilter === "all" ? "default" : "outline"}
            onClick={() => setStatusFilter("all")}
          >
            All
          </Button>
          <Button
            type="button"
            variant={statusFilter === "active" ? "default" : "outline"}
            onClick={() => setStatusFilter("active")}
          >
            Active
          </Button>
          <Button
            type="button"
            variant={statusFilter === "inactive" ? "default" : "outline"}
            onClick={() => setStatusFilter("inactive")}
          >
            Inactive
          </Button>
        </div>
      </div>

      <Dialog open={isResultsOpen} onOpenChange={setIsResultsOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Poll Results</DialogTitle>
          </DialogHeader>
          {selectedPollForResults ? (
            <div className="space-y-4">
              <div className="font-semibold">{selectedPollForResults.question}</div>
              {resultsQuery.isLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading results...
                </div>
              ) : (
                <div className="space-y-2">
                  {(selectedPollForResults.options ?? []).map((opt, idx) => {
                    const result = (resultsQuery.data ?? []).find((r) => r.option_index === idx);
                    const count = result?.vote_count ?? 0;
                    const pct = totalVotesForResults > 0 ? Math.round((count / totalVotesForResults) * 100) : 0;
                    return (
                      <div key={idx} className="flex items-center justify-between rounded-md border p-3">
                        <div className="font-medium">{opt.text}</div>
                        <div className="text-sm text-muted-foreground">
                          {count} votes ({pct}%)
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="text-sm text-muted-foreground">Total votes: {totalVotesForResults}</div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Question</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>End Date</TableHead>
              <TableHead>Total Votes</TableHead>
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
            ) : filteredPolls.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24">
                  No polls found.
                </TableCell>
              </TableRow>
            ) : (
              filteredPolls.map((poll) => (
                <TableRow key={poll.id}>
                  <TableCell className="font-medium max-w-[520px] truncate" title={poll.question}>
                    {poll.question}
                  </TableCell>
                  <TableCell>{poll.active ? "Active" : "Inactive"}</TableCell>
                  <TableCell>{poll.end_date ? new Date(poll.end_date).toLocaleString() : "-"}</TableCell>
                  <TableCell>{poll.total_votes?.toLocaleString?.() ?? 0}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => openResults(poll)}>
                      <BarChart3 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(poll)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm("Reset all votes for this poll?")) {
                          resetVotesMutation.mutate(poll.id);
                        }
                      }}
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:text-red-600"
                      onClick={() => {
                        if (confirm("Are you sure you want to delete this poll?")) {
                          deleteMutation.mutate(poll.id);
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
};

export default PollManager;
