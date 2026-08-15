"use client";

import * as React from "react";
import Image from "next/image";
import { ImagePlus, Loader2, Trash2, Upload } from "lucide-react";
import {
  ALLOWED_IMAGE_TYPES,
  MEDIA_ASPECT,
  isAllowedImageType,
  type MediaPurpose,
} from "@/domain/media";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Upload control for a single image.
 *
 * Drop a file on it, click it, or paste a screenshot. The obvious mistakes —
 * wrong format, too big — are caught here so the answer is instant, but the
 * server checks the same things again from the bytes and its message wins:
 * client-side validation is a courtesy, not a gate.
 *
 * Progress comes from `XMLHttpRequest` rather than `fetch`, which still has no
 * upload progress event. On a Kenyan mobile connection a 4 MB photograph is not
 * instant, and a control that looks frozen gets clicked again.
 */

export interface ImageUploadProps {
  /** Current image URL, or null when nothing is set. */
  value: string | null;
  onChange: (url: string | null) => void;
  purpose: MediaPurpose;
  /** Describes the frame, e.g. "Shown full width at the top of the invitation." */
  hint?: string;
  /** Used for the input id and the drop zone's accessible name. */
  id: string;
  label: string;
  className?: string;
}

interface UploadResponse {
  data?: { url: string };
  error?: { message: string };
}

const MAX_BYTES = 8 * 1024 * 1024;
const ACCEPT = ALLOWED_IMAGE_TYPES.join(",");

export function ImageUpload({
  value,
  onChange,
  purpose,
  hint,
  id,
  label,
  className,
}: ImageUploadProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = React.useState(false);
  const [progress, setProgress] = React.useState<number | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const busy = progress !== null;
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  const upload = React.useCallback(
    (file: File) => {
      setError(null);

      if (!isAllowedImageType(file.type)) {
        setError("Invitations can use JPEG, PNG or WebP images. That file is a different type.");
        return;
      }
      if (file.size > MAX_BYTES) {
        setError(
          `That image is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is 8 MB — try a smaller version.`,
        );
        return;
      }

      const body = new FormData();
      body.append("file", file);
      body.append("purpose", purpose);

      const request = new XMLHttpRequest();
      request.open("POST", "/api/v1/organizers/media");

      request.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          setProgress(Math.round((event.loaded / event.total) * 100));
        }
      });

      request.addEventListener("load", () => {
        setProgress(null);
        let payload: UploadResponse = {};
        try {
          payload = JSON.parse(request.responseText) as UploadResponse;
        } catch {
          setError("That upload did not complete. Try again.");
          return;
        }
        if (request.status >= 200 && request.status < 300 && payload.data) {
          onChange(payload.data.url);
        } else {
          setError(payload.error?.message ?? "That upload did not complete. Try again.");
        }
      });

      request.addEventListener("error", () => {
        setProgress(null);
        setError("The upload lost its connection. Check your network and try again.");
      });

      setProgress(0);
      request.send(body);
    },
    [onChange, purpose],
  );

  function onFiles(files: FileList | null) {
    const file = files?.[0];
    if (file) upload(file);
  }

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-sm font-medium text-ink">{label}</span>

      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        onChange={(event) => {
          onFiles(event.target.files);
          // Allow re-selecting the same file after a removal.
          event.target.value = "";
        }}
      />

      {value ? (
        <div className="overflow-hidden rounded-card border border-line bg-surface">
          <div
            className="relative w-full bg-surface-secondary"
            style={{ aspectRatio: String(MEDIA_ASPECT[purpose]) }}
          >
            <Image
              src={value}
              alt=""
              fill
              sizes="(max-width: 1024px) 100vw, 640px"
              className="object-cover"
              unoptimized
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 border-t border-line p-3">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
            >
              <Upload className="size-4" aria-hidden="true" />
              Replace
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setError(null);
                onChange(null);
              }}
              disabled={busy}
            >
              <Trash2 className="size-4" aria-hidden="true" />
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onPaste={(event) => onFiles(event.clipboardData.files)}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            onFiles(event.dataTransfer.files);
          }}
          aria-describedby={[hint ? hintId : null, error ? errorId : null]
            .filter(Boolean)
            .join(" ")}
          className={cn(
            "flex w-full flex-col items-center justify-center gap-2 rounded-card border border-dashed px-6 py-10 text-center transition-colors",
            dragging
              ? "border-primary bg-primary-tint"
              : "border-line-strong bg-surface-secondary hover:border-primary/50 hover:bg-primary-tint/40",
            error && "border-error",
          )}
        >
          {busy ? (
            <>
              <Loader2 className="size-6 animate-spin text-primary" aria-hidden="true" />
              <span className="text-sm font-medium text-ink">Uploading… {progress}%</span>
              <span
                className="mt-1 h-1 w-40 overflow-hidden rounded-pill bg-line"
                role="progressbar"
                aria-valuenow={progress ?? 0}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Upload progress"
              >
                <span
                  className="block h-full bg-primary transition-[width]"
                  style={{ width: `${progress ?? 0}%` }}
                />
              </span>
            </>
          ) : (
            <>
              <ImagePlus className="size-6 text-muted" aria-hidden="true" />
              <span className="text-sm font-medium text-ink">
                Drop a photo here, or choose one
              </span>
              <span className="text-xs text-muted">JPEG, PNG or WebP · up to 8 MB</span>
            </>
          )}
        </button>
      )}

      {hint && !error ? (
        <p id={hintId} className="text-xs text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-xs font-medium text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
