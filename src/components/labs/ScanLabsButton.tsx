import { useState, useRef, useCallback } from 'react';
import { clsx } from 'clsx';
import {
  Camera,
  Upload,
  X,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ImageIcon,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { uploadLabImage, addLabPanel } from '@/services/firebase/labs';
import { compressImage } from '@/utils/imageUtils';
import { Button } from '@/components/ui/Button';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import type { LabPanel } from '@/types/lab';

// ─── Types ─────────────────────────────────────────────────────────────────

interface PendingImage {
  file: File;
  preview: string;
  /** Date the image was taken — defaults to file.lastModified */
  takenAt: Date;
}

export interface ScanLabsButtonProps {
  patientId: string;
  onSaved: (panels: LabPanel[]) => void;
}

// ─── Component ─────────────────────────────────────────────────────────────

export function ScanLabsButton({ patientId, onSaved }: ScanLabsButtonProps) {
  const user = useAuthStore((s) => s.user);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [images, setImages] = useState<PendingImage[]>([]);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  function openModal() {
    setImages([]);
    setSaving(false);
    setProgress(0);
    setError(null);
    setOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setOpen(false);
  }

  // ── Add files ───────────────────────────────────────────────────────────

  const addFiles = useCallback((files: File[]) => {
    const valid = files.filter(
      (f) => f.type.startsWith('image/') && f.size <= 20 * 1024 * 1024,
    );
    if (!valid.length) {
      setError('Only image files up to 20 MB are supported.');
      return;
    }
    setError(null);

    valid.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImages((prev) => [
          ...prev,
          {
            file,
            preview: e.target?.result as string,
            takenAt: new Date(file.lastModified || Date.now()),
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
  }, []);

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  function updateDate(index: number, value: string) {
    setImages((prev) =>
      prev.map((img, i) =>
        i === index ? { ...img, takenAt: new Date(value) } : img,
      ),
    );
  }

  // ── Drag handlers ────────────────────────────────────────────────────────

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(true);
  }
  function onDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
  }
  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    addFiles(Array.from(e.dataTransfer.files));
  }

  // ── Save ─────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!user || images.length === 0) return;
    setSaving(true);
    setError(null);
    setProgress(0);

    const saved: LabPanel[] = [];

    try {
      const { Timestamp } = await import('firebase/firestore');
      const now = Timestamp.fromDate(new Date());

      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        setProgress(Math.round(((i + 0.5) / images.length) * 100));

        const { blob: compressed } = await compressImage(img.file);
        const imageUrl = await uploadLabImage(user.id, compressed, img.file.name);

        const collectedAt = Timestamp.fromDate(img.takenAt);
        const dateLabel = img.takenAt.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });

        const panel: Omit<LabPanel, 'id' | 'createdAt'> = {
          patientId,
          category: 'MISC',
          panelName: `Lab Image — ${dateLabel}`,
          values: [],
          collectedAt,
          resultedAt: now,
          orderedBy: user.id || user.email || 'unknown',
          status: 'pending',
          source: 'image',
          imageUrl,
        };

        const id = await addLabPanel(patientId, panel);
        saved.push({ ...panel, id, createdAt: now } as LabPanel);
        setProgress(Math.round(((i + 1) / images.length) * 100));
      }

      onSaved(saved);
      setOpen(false);
    } catch (err) {
      console.error('Upload error:', err);
      setError('Upload failed. Please try again.');
      setSaving(false);
    }
  }

  // ── Date input value helper ───────────────────────────────────────────────

  function toDateInputValue(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Trigger — dashed drop zone */}
      <button
        type="button"
        onClick={openModal}
        onDragOver={(e) => { e.preventDefault(); openModal(); }}
        className={clsx(
          'group flex items-center gap-3 w-full rounded-xl border-2 border-dashed px-4 py-3 transition-all text-left',
          'border-slate-200 hover:border-primary-400 hover:bg-primary-50/40',
          'dark:border-slate-700 dark:hover:border-primary-600 dark:hover:bg-primary-950/20',
        )}
      >
        <div className="w-9 h-9 rounded-lg bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center shrink-0 group-hover:bg-primary-200 dark:group-hover:bg-primary-800/50 transition-colors">
          <Camera size={18} className="text-primary-600 dark:text-primary-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Add Lab Images</p>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Photo, drag & drop, or browse — saved and grouped by date
          </p>
        </div>
        <Upload size={14} className="text-slate-300 dark:text-slate-600 shrink-0" />
      </button>

      {/* Modal */}
      <Modal
        open={open}
        onClose={closeModal}
        title="Add Lab Images"
        size="lg"
        closeOnBackdropClick={!saving}
      >
        <div className="space-y-4">
          {/* Drop zone (when no images yet) */}
          {images.length === 0 && (
            <div
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              className={clsx(
                'flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed py-10 px-6 transition-all',
                dragOver
                  ? 'border-primary-500 bg-primary-50/60 dark:bg-primary-950/30'
                  : 'border-slate-200 dark:border-slate-700',
              )}
            >
              <div className={clsx(
                'w-14 h-14 rounded-2xl flex items-center justify-center transition-colors',
                dragOver ? 'bg-primary-100 dark:bg-primary-900/50' : 'bg-slate-100 dark:bg-slate-800',
              )}>
                {dragOver
                  ? <Upload size={26} className="text-primary-500" />
                  : <ImageIcon size={26} className="text-slate-400 dark:text-slate-500" />
                }
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {dragOver ? 'Drop to add' : 'Drag & drop lab images here'}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">or choose an option below</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.removeAttribute('capture');
                      fileInputRef.current.click();
                    }
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors"
                >
                  <Upload size={14} />
                  Browse files
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.setAttribute('capture', 'environment');
                      fileInputRef.current.click();
                    }
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium transition-colors"
                >
                  <Camera size={14} />
                  Camera
                </button>
              </div>
            </div>
          )}

          {/* Selected images list */}
          {images.length > 0 && (
            <div className="space-y-3">
              {images.map((img, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30"
                >
                  {/* Thumbnail */}
                  <img
                    src={img.preview}
                    alt={`Lab image ${i + 1}`}
                    className="h-16 w-20 object-cover rounded-lg border border-slate-200 dark:border-slate-700 shrink-0"
                  />

                  {/* Info */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
                      {img.file.name}
                    </p>
                    <div className="flex items-center gap-2">
                      <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide shrink-0">
                        Date taken
                      </label>
                      <input
                        type="date"
                        value={toDateInputValue(img.takenAt)}
                        onChange={(e) => updateDate(i, e.target.value)}
                        className="h-7 px-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary-400"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">
                      {(img.file.size / 1024).toFixed(0)} KB
                    </p>
                  </div>

                  {/* Remove */}
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="p-1 rounded text-slate-300 hover:text-red-500 dark:text-slate-600 dark:hover:text-red-400 transition-colors shrink-0"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}

              {/* Add more */}
              <button
                type="button"
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.removeAttribute('capture');
                    fileInputRef.current.click();
                  }
                }}
                className="flex items-center gap-2 text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium transition-colors"
              >
                <Upload size={13} />
                Add more images
              </button>
            </div>
          )}

          {/* Saving progress */}
          {saving && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Loader2 size={12} className="animate-spin text-primary-500" />
                  Uploading…
                </span>
                <span className="text-xs font-bold text-primary-600 dark:text-primary-400 tabular-nums">
                  {progress}%
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
              <AlertTriangle size={13} />
              {error}
            </div>
          )}
        </div>

        <ModalFooter>
          <Button variant="secondary" onClick={closeModal} disabled={saving}>
            Cancel
          </Button>
          {images.length > 0 && (
            <Button
              onClick={handleSave}
              disabled={saving}
              iconLeft={saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            >
              {saving ? 'Saving…' : `Save ${images.length} image${images.length !== 1 ? 's' : ''}`}
            </Button>
          )}
        </ModalFooter>
      </Modal>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = '';
          if (files.length) addFiles(files);
        }}
        className="absolute w-0 h-0 opacity-0 overflow-hidden"
      />
    </>
  );
}
