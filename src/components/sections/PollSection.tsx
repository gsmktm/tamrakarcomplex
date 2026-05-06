import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { format, differenceInDays } from "date-fns";
import { toast } from "sonner";

interface PollOption {
  text: string;
  votes: number;
}

interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  end_date: string | null;
  total_votes: number;
}

interface PollSectionProps {
    settings?: {
        // We can add settings like background color or title visibility here later
        background?: string;
    };
}

export function PollSection({ settings = {} }: PollSectionProps) {
  const { user } = useAuth();
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [hasVoted, setHasVoted] = useState(false);

  const { data: poll, isLoading, refetch } = useQuery({
    queryKey: ["active-poll"],
    queryFn: async () => {
      // Fetch the active poll
      const { data: pollData, error: pollError } = await supabase
        .from("polls")
        .select("*")
        .eq("active", true)
        .single();

      if (pollError) throw pollError;
      
      // Fetch aggregated vote counts using secure RPC function
      // This only returns counts, not individual vote records
      const { data: voteResults, error: voteError } = await supabase
        .rpc("get_poll_results", { p_poll_id: pollData.id });

      // Merge vote counts into options
      const options = (pollData.options as unknown as PollOption[]).map((opt, idx) => {
        const voteData = (voteResults as { option_index: number; vote_count: number }[] | null)?.find(
          (v) => v.option_index === idx
        );
        return {
          ...opt,
          votes: voteData?.vote_count || 0
        };
      });

      const totalVotes = options.reduce((sum, opt) => sum + opt.votes, 0);

      return {
        ...pollData,
        options,
        total_votes: totalVotes
      } as Poll;
    },
    retry: false // Don't retry if no active poll
  });

  const handleVote = async () => {
    if (!user) {
      toast.error("Please login to vote");
      return;
    }

    if (selectedOption === null || !poll) {
      toast.error("Please select an option");
      return;
    }

    try {
      // Insert the vote into poll_votes table
      const { error } = await supabase
        .from("poll_votes")
        .insert({
          poll_id: poll.id,
          user_id: user.id,
          option_index: selectedOption
        });

      if (error) {
        if (error.code === "23505") {
          toast.error("You have already voted in this poll");
        } else {
          throw error;
        }
      } else {
        setHasVoted(true);
        toast.success("Vote recorded!");
        refetch(); // Refresh to show updated counts
      }
    } catch (error) {
      toast.error("Failed to submit vote");
    }
  };

  if (isLoading || !poll) return null;

  const daysLeft = poll.end_date 
    ? differenceInDays(new Date(poll.end_date), new Date()) 
    : null;

  return (
    <section className="py-12 bg-gradient-to-br from-primary/5 to-secondary/30">
      <div className="container">
        <div className="max-w-2xl mx-auto">
          <div className="bg-card rounded-2xl border p-6 md:p-8 shadow-lg">
            {daysLeft !== null && daysLeft > 0 && (
              <div className="text-sm text-muted-foreground mb-4">
                Ends In: {format(new Date(poll.end_date!), "MMM d, yyyy")}
              </div>
            )}

            <h3 className="text-xl md:text-2xl font-display font-bold mb-6">
              {poll.question}
            </h3>

            <div className="space-y-3">
              {poll.options.map((option, index) => {
                const percentage = poll.total_votes > 0 
                  ? Math.round((option.votes / poll.total_votes) * 100) 
                  : 0;

                return (
                  <button
                    key={index}
                    onClick={() => !hasVoted && setSelectedOption(index)}
                    disabled={hasVoted}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      hasVoted
                        ? "cursor-default"
                        : selectedOption === index
                        ? "border-primary bg-primary/10"
                        : "hover:border-primary/50 hover:bg-secondary/50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center font-semibold text-sm">
                          {String.fromCharCode(65 + index)}
                        </span>
                        <span className="font-medium">{option.text}</span>
                      </div>
                      {hasVoted && (
                        <span className="text-sm font-semibold text-primary">
                          {percentage}%
                        </span>
                      )}
                    </div>
                    {hasVoted && (
                      <Progress value={percentage} className="h-2" />
                    )}
                  </button>
                );
              })}
            </div>

            {!hasVoted && (
              <Button 
                onClick={handleVote} 
                className="w-full mt-6"
                disabled={selectedOption === null}
              >
                Submit Vote
              </Button>
            )}

            <div className="text-center text-sm text-muted-foreground mt-4">
              Total votes: {poll.total_votes.toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
