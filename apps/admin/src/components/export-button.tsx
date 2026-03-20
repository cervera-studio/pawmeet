'use client';

import { useCallback } from 'react';
import { Button } from '@/components/ui/button';

interface ExportButtonProps {
  data: object[];
  filename: string;
  label?: string;
}

function toCsv(data: object[]): string {
  if (data.length === 0) return '';

  const headers = Object.keys(data[0] as Record<string, unknown>);

  const escapeCell = (value: unknown): string => {
    const str = value === null || value === undefined ? '' : String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerRow = headers.map(escapeCell).join(',');
  const rows = data.map((row) =>
    headers.map((h) => escapeCell((row as Record<string, unknown>)[h])).join(','),
  );

  return [headerRow, ...rows].join('\n');
}

export function ExportButton({ data, filename, label }: ExportButtonProps) {
  const handleExport = useCallback(() => {
    const csv = toCsv(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [data, filename]);

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={data.length === 0}>
      <DownloadIcon className="mr-2 h-4 w-4" />
      {label ?? 'Export CSV'}
    </Button>
  );
}

function DownloadIcon({ className }: { className?: string }) {
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
      <title>Download</title>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" x2="12" y1="15" y2="3" />
    </svg>
  );
}
