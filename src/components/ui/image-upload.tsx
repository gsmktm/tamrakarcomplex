
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ImagePlus, X, Loader2 } from "lucide-react";
import { SafeImage } from "@/components/common/SafeImage";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/utils";

interface ImageUploadProps {
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
}

export function ImageUpload({ value, onChange, disabled }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      setIsUploading(true);
      const newUrls: string[] = [];

      for (const file of files) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("marketplace")
          .upload(filePath, file);

        if (uploadError) {
          throw uploadError;
        }

        const { data } = supabase.storage
          .from("marketplace")
          .getPublicUrl(filePath);

        newUrls.push(data.publicUrl);
      }

      onChange([...value, ...newUrls]);
      toast.success("Images uploaded successfully");
    } catch (error: unknown) {
      toast.error("Error uploading images", {
        description: getErrorMessage(error),
      });
    } finally {
      setIsUploading(false);
    }
  };

  const onRemove = (url: string) => {
    onChange(value.filter((current) => current !== url));
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        {value.map((url) => (
          <div key={url} className="relative aspect-square rounded-md overflow-hidden border">
            <div className="absolute top-2 right-2 z-10">
              <Button
                type="button"
                onClick={() => onRemove(url)}
                variant="destructive"
                size="icon"
                className="h-6 w-6"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <SafeImage
              src={url}
              alt="Image"
              className="object-cover w-full h-full"
            />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-4">
        <Button
          type="button"
          disabled={disabled || isUploading}
          variant="secondary"
          className="relative"
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <ImagePlus className="h-4 w-4 mr-2" />
          )}
          Upload Images
          <input
            type="file"
            accept="image/*"
            multiple
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            onChange={onUpload}
            disabled={disabled || isUploading}
          />
        </Button>
        <p className="text-xs text-muted-foreground">
          Supported formats: JPG, PNG, WEBP
        </p>
      </div>
    </div>
  );
}
