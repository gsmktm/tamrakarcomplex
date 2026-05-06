import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getErrorMessage } from "@/lib/utils";
import { writeAuditLog } from "@/lib/auditLog";

export type ProfileRecord = {
  id: string;
  full_name: string | null;
  display_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: string | null;
  status: string | null;
  bio: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export function useProfile() {
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: ["current-profile"],
    queryFn: getCurrentProfile,
  });

  const updateMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: async (_, variables) => {
      await writeAuditLog({
        action: "profile.update",
        module: "profiles",
        targetId: variables.id ?? null,
        newData: variables,
      });
      await queryClient.invalidateQueries({ queryKey: ["current-profile"] });
    },
  });

  return {
    data: profileQuery.data,
    loading: profileQuery.isLoading,
    error: profileQuery.error ? getErrorMessage(profileQuery.error) : null,
    refetch: profileQuery.refetch,
    getCurrentProfile,
    updateProfile: updateMutation.mutateAsync,
    uploadAvatar,
    saveProfileChanges: saveProfileChanges(updateMutation.mutateAsync),
  };
}

export async function getCurrentProfile(): Promise<ProfileRecord | null> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (error) throw error;
  return (data as ProfileRecord | null) ?? null;
}

type UpdateProfilePayload = Partial<ProfileRecord> & { id?: string };

export async function updateProfile(payload: UpdateProfilePayload): Promise<ProfileRecord> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) throw new Error("You must be logged in.");

  const targetId = payload.id ?? authData.user.id;
  const { data, error } = await supabase
    .from("profiles")
    .update({
      ...payload,
      id: undefined,
      updated_at: new Date().toISOString(),
    })
    .eq("id", targetId)
    .select("*")
    .single();

  if (error) throw error;
  return data as ProfileRecord;
}

export async function uploadAvatar(file: File): Promise<string> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) throw new Error("You must be logged in.");

  const extension = file.name.split(".").pop() || "jpg";
  const filePath = `${authData.user.id}/${Date.now()}.${extension}`;

  const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file, {
    upsert: true,
  });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
  if (!data?.publicUrl) throw new Error("Avatar upload succeeded but URL is missing.");
  return data.publicUrl;
}

export function saveProfileChanges(
  updateFn: (payload: UpdateProfilePayload) => Promise<ProfileRecord>,
) {
  return async (payload: UpdateProfilePayload & { avatarFile?: File | null }) => {
    const { avatarFile, ...basePayload } = payload;
    let nextPayload: UpdateProfilePayload = { ...basePayload };

    if (avatarFile) {
      const avatarUrl = await uploadAvatar(avatarFile);
      nextPayload = { ...nextPayload, avatar_url: avatarUrl };
    }

    return updateFn(nextPayload);
  };
}
