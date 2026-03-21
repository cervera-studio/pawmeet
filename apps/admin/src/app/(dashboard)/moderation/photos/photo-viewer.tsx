'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import type { PendingPhoto } from '@/repositories';

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;

interface PhotoViewerProps {
  photos: PendingPhoto[];
  currentIndex: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove: (photoId: string) => void;
  onReject: (photoId: string) => void;
  approveLabel: string;
  rejectLabel: string;
}

export function PhotoViewer({
  photos,
  currentIndex,
  open,
  onOpenChange,
  onApprove,
  onReject,
  approveLabel,
  rejectLabel,
}: PhotoViewerProps) {
  const [index, setIndex] = useState(currentIndex);
  const [zoom, setZoom] = useState(1);

  // Sync index when opened on a new photo
  useEffect(() => {
    setIndex(currentIndex);
    setZoom(1);
  }, [currentIndex, open]);

  const photo = photos[index];

  const goNext = useCallback(() => {
    if (index < photos.length - 1) {
      setIndex((i) => i + 1);
      setZoom(1);
    }
  }, [index, photos.length]);

  const goPrev = useCallback(() => {
    if (index > 0) {
      setIndex((i) => i - 1);
      setZoom(1);
    }
  }, [index]);

  const zoomIn = useCallback(() => {
    setZoom((z) => Math.min(z + ZOOM_STEP, MAX_ZOOM));
  }, []);

  const zoomOut = useCallback(() => {
    setZoom((z) => Math.max(z - ZOOM_STEP, MIN_ZOOM));
  }, []);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      switch (e.key) {
        case 'ArrowLeft':
          goPrev();
          break;
        case 'ArrowRight':
          goNext();
          break;
        case 'Escape':
          onOpenChange(false);
          break;
        case '+':
        case '=':
          zoomIn();
          break;
        case '-':
          zoomOut();
          break;
        case 'a':
        case 'A':
          if (photo) {
            onApprove(photo.id);
            if (index >= photos.length - 1 && index > 0) {
              setIndex((i) => i - 1);
            }
          }
          break;
        case 'r':
        case 'R':
          if (photo) {
            onReject(photo.id);
            if (index >= photos.length - 1 && index > 0) {
              setIndex((i) => i - 1);
            }
          }
          break;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, goNext, goPrev, zoomIn, zoomOut, onOpenChange]);

  // Scroll wheel zoom
  function handleWheel(e: React.WheelEvent) {
    e.preventDefault();
    if (e.deltaY < 0) {
      zoomIn();
    } else {
      zoomOut();
    }
  }

  if (!photo) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full p-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
          <div className="text-sm text-neutral-600">
            <span className="font-medium">{photo.userName}</span>
            {photo.dogName ? (
              <span className="text-neutral-400"> &mdash; {photo.dogName}</span>
            ) : null}
            <span className="ml-2 text-neutral-400">
              ({index + 1}/{photos.length})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={zoomOut} disabled={zoom <= MIN_ZOOM}>
              -
            </Button>
            <span className="text-xs text-neutral-500 w-12 text-center tabular-nums">
              {Math.round(zoom * 100)}%
            </span>
            <Button variant="outline" size="sm" onClick={zoomIn} disabled={zoom >= MAX_ZOOM}>
              +
            </Button>
          </div>
        </div>

        {/* Image area */}
        <div
          className="relative flex items-center justify-center bg-neutral-950 overflow-auto"
          style={{ height: '60vh' }}
          onWheel={handleWheel}
        >
          {/* Prev button */}
          {index > 0 && (
            <button
              type="button"
              onClick={goPrev}
              className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition-colors"
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
          )}

          <img
            src={photo.imageUrl}
            alt={photo.userName ?? ''}
            className="max-h-full object-contain transition-transform duration-150"
            style={{ transform: `scale(${zoom})` }}
            draggable={false}
          />

          {/* Next button */}
          {index < photos.length - 1 && (
            <button
              type="button"
              onClick={goNext}
              className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition-colors"
            >
              <ChevronRightIcon className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-center gap-4 border-t border-neutral-200 px-4 py-3">
          <Button
            variant="secondary"
            onClick={() => {
              onApprove(photo.id);
              if (index >= photos.length - 1 && index > 0) {
                setIndex((i) => i - 1);
              }
            }}
          >
            {approveLabel}
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              onReject(photo.id);
              if (index >= photos.length - 1 && index > 0) {
                setIndex((i) => i - 1);
              }
            }}
          >
            {rejectLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <title>Previous</title>
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <title>Next</title>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
