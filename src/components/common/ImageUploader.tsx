import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/utils";

type Props = {
  value: string[];
  onChange: (urls: string[]) => void;
  folder?: string;
  disabled?: boolean;
};

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

export function ImageUploader({ value, onChange, folder = "marketplace", disabled }: Props) {
  const [pending, setPending] = useState(false);

  const handleFiles = async (files: FileList | null, input: HTMLInputElement) => {
    if (!files || files.length === 0) return;
    setPending(true);
    const urls: string[] = [...value];
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) {
          throw new Error(`${file.name} is not an image file`);
        }

        if (file.size > MAX_IMAGE_SIZE_BYTES) {
          throw new Error(`${file.name} is larger than 5MB`);
        }

        const timestamp = Date.now();
        const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, "_");
        const path = `${folder}/${timestamp}_${crypto.randomUUID()}_${safeName}`;
        const { error } = await supabase.storage.from("uploads").upload(path, file, {
          upsert: false,
          cacheControl: "3600",
          contentType: file.type,
        });
        if (error) throw error;
        const { data } = supabase.storage.from("uploads").getPublicUrl(path);
        urls.push(data.publicUrl);
      }
      onChange(urls);
      toast.success(files.length === 1 ? "Image uploaded" : "Images uploaded");
    } catch (error: unknown) {
      toast.error("Image upload failed", {
        description: getErrorMessage(error),
      });
    } finally {
      input.value = "";
      setPending(false);
    }
  };

  const removeImage = (url: string) => {
    onChange(value.filter((current) => current !== url));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(event) => handleFiles(event.target.files, event.currentTarget)}
          disabled={disabled || pending}
        />
        <Button type="button" variant="outline" disabled={disabled || pending}>
          {pending ? "Uploading…" : "Upload"}
        </Button>
      </div>
      {value.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {value.map((url, i) => (
            <div key={`${url}-${i}`} className="relative aspect-square overflow-hidden rounded border">
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute right-1 top-1 z-10 h-7 w-7"
                onClick={() => removeImage(url)}
                disabled={disabled || pending}
                aria-label={`Remove uploaded image ${i + 1}`}
              >
                <X className="h-4 w-4" />
              </Button>
              <img src={url} alt={`Uploaded ${i + 1}`} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
