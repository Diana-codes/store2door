"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileUp, CheckCircle2, AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { importSalesCsv } from "../actions";

type ImportResult = {
  ok?: true;
  successful?: number;
  failed?: number;
  errors?: string[];
  error?: string;
};

export function ImportForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [filename, setFilename] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [extensionWarning, setExtensionWarning] = useState<string | null>(
    null,
  );
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  async function onFile(file: File) {
    setFilename(file.name);
    const text = await file.text();
    setPreview(text.slice(0, 600));
    setResult(null);
    setExtensionWarning(
      /\.csv$/i.test(file.name)
        ? null
        : `"${file.name}" doesn't look like a .csv file — imports need a CSV export, not a PDF, Word, or Excel file.`,
    );
  }

  function clearFile() {
    if (fileInput.current) fileInput.current.value = "";
    setFilename(null);
    setPreview(null);
    setExtensionWarning(null);
    setResult(null);
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2">
        <Label htmlFor="csv">CSV file</Label>
        <div className="flex items-center gap-3">
          <input
            ref={fileInput}
            id="csv"
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
            }}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInput.current?.click()}
          >
            <FileUp className="size-4" />
            Choose file
          </Button>
          <span className="text-sm text-muted-foreground">
            {filename ?? "No file chosen"}
          </span>
          {filename && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearFile}
              disabled={pending}
              aria-label="Remove selected file"
            >
              <X className="size-3.5" />
              Remove
            </Button>
          )}
        </div>
      </div>

      {extensionWarning && (
        <div className="flex items-start gap-2 rounded-md border border-amber-300/50 bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
          <p>{extensionWarning}</p>
        </div>
      )}

      {preview && (
        <div className="rounded-md border bg-muted/40">
          <div className="border-b px-3 py-2 text-xs text-muted-foreground">
            Preview (first 600 chars)
          </div>
          <pre className="max-h-48 overflow-auto p-3 text-xs whitespace-pre-wrap">
            {preview}
          </pre>
        </div>
      )}

      <Button
        type="button"
        disabled={!filename || pending}
        onClick={() => {
          const file = fileInput.current?.files?.[0];
          if (!file) return;
          startTransition(async () => {
            const csv = await file.text();
            const res = await importSalesCsv({ csv, filename: file.name });
            setResult(res as ImportResult);
            if (res.error) {
              toast.error(res.error);
              return;
            }
            toast.success(
              `Imported ${res.successful} sale${res.successful === 1 ? "" : "s"}` +
                (res.failed ? ` · ${res.failed} skipped` : ""),
            );
            router.refresh();
          });
        }}
      >
        {pending ? "Importing…" : "Import"}
      </Button>

      {result?.ok && (
        <div className="rounded-md border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-center gap-2 text-primary">
            <CheckCircle2 className="size-4" />
            <p className="text-sm font-medium">
              {result.successful} imported
              {result.failed ? ` · ${result.failed} skipped` : ""}
            </p>
          </div>
          {result.errors && result.errors.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              {result.errors.map((e, i) => (
                <li key={i}>• {e}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {result?.error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="size-4" />
            <p className="text-sm font-medium">{result.error}</p>
          </div>
        </div>
      )}
    </div>
  );
}
