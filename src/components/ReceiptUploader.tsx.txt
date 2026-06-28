import { useRef, useState } from "react";
import { Loader2, Upload, X, FileImage } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = "image/png,image/jpeg,image/webp";
const BUCKET = "payment-receipts";

function uniqueFilename(userId: string, file: File): string {
  const ext = file.name.split(".").pop() ?? "jpg";
  // Stored under a per-user folder so storage RLS policies can scope access.
  return `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
}

export function ReceiptUploader({
  userId,
  value,
  onChange,
}: {
  userId: string;
  value: string | null;
  onChange: (path: string | null) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    if (!file.type.startsWith("image/")) return toast.error("Only image files are allowed");
    if (file.size > MAX_BYTES) return toast.error("Receipt image must be 5MB or smaller");

    setUploading(true);
    try {
      const path = uniqueFilename(userId, file);
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: false, cacheControl: "3600" });

      if (error) {
        toast.error(error.message ?? "Upload failed");
        return;
      }

      // Bucket is private — store the storage path, not a public URL.
      // A signed URL is generated on demand for local preview / admin review.
      const { data: signed } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(path, 60 * 60);

      setPreviewUrl(signed?.signedUrl ?? null);
      onChange(path);
      toast.success("Receipt uploaded");
    } catch {
      toast.error("Upload failed — please try again");
    } finally {
      setUploading(false);
    }
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) upload(f);
    e.target.value = "";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) upload(f);
  };

  if (value) {
    return (
      <div className="mt-1 relative inline-block group">
        {previewUrl ? (
          <img src={previewUrl} alt="Receipt" className="w-full max-w-xs h-40 object-cover rounded-lg border border-border" />
        ) : (
          <div className="w-full max-w-xs h-40 rounded-lg border border-border bg-muted flex items-center justify-center gap-2 text-muted-foreground text-sm">
            <FileImage className="w-4 h-4" /> Receipt attached
          </div>
        )}
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={() => { setPreviewUrl(null); onChange(null); }}
          className="absolute top-2 right-2 h-7 w-7 p-0 opacity-90"
          aria-label="Remove receipt"
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      onClick={() => !uploading && inputRef.current?.click()}
      className={`mt-1 border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-colors ${
        dragOver ? "border-orange-400 bg-orange-50" : "border-gray-200 hover:border-orange-300"
      } ${uploading ? "pointer-events-none opacity-70" : ""}`}
    >
      <input ref={inputRef} type="file" accept={ACCEPT} onChange={onPick} className="hidden" />
      {uploading ? (
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-5 h-5 text-orange-500 animate-spin" />
          <p className="text-xs text-muted-foreground">Uploading…</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-1.5">
          <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center">
            <Upload className="w-4 h-4 text-orange-600" />
          </div>
          <p className="text-sm font-medium text-gray-700">Upload receipt screenshot</p>
          <p className="text-xs text-muted-foreground">PNG, JPG, WEBP · up to 5MB</p>
        </div>
      )}
    </div>
  );
}
