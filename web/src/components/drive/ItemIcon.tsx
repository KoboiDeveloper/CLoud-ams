'use client';

import {
  File,
  FileArchive,
  FileAudio,
  FileCode,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
  Folder,
} from 'lucide-react';
import { DriveItem } from '@/lib/drive/driveTypes';
import { cn } from '@/lib/utils';

export function ItemIcon({
  item,
  className = 'h-12 w-12',
}: {
  item: DriveItem;
  className?: string;
}) {
  if (item.type === 'FOLDER') {
    return (
      <Folder
        className={cn(className, 'text-[#a7c4fa]')}
        fill="currentColor"
        strokeWidth={1.25}
      />
    );
  }

  const mime = (item.mimeType || '').toLowerCase();
  const name = item.name.toLowerCase();

  if (mime.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg)$/.test(name)) {
    return <FileImage className={cn(className, 'text-sky-400')} strokeWidth={1.5} />;
  }
  if (mime.includes('pdf') || name.endsWith('.pdf')) {
    return <FileText className={cn(className, 'text-red-500')} strokeWidth={1.5} />;
  }
  if (
    mime.includes('sheet') ||
    mime.includes('excel') ||
    mime.includes('csv') ||
    /\.(xlsx?|csv)$/.test(name)
  ) {
    return <FileSpreadsheet className={cn(className, 'text-emerald-500')} strokeWidth={1.5} />;
  }
  if (
    mime.includes('word') ||
    mime.includes('msword') ||
    mime.includes('document') ||
    /\.docx?$/.test(name)
  ) {
    return <FileText className={cn(className, 'text-blue-500')} strokeWidth={1.5} />;
  }
  if (
    mime.includes('presentation') ||
    mime.includes('powerpoint') ||
    /\.pptx?$/.test(name)
  ) {
    return <FileText className={cn(className, 'text-orange-500')} strokeWidth={1.5} />;
  }
  if (mime.startsWith('video/') || /\.(mp4|webm|mov|mkv)$/.test(name)) {
    return <FileVideo className={cn(className, 'text-violet-400')} strokeWidth={1.5} />;
  }
  if (mime.startsWith('audio/') || /\.(mp3|wav|ogg|m4a)$/.test(name)) {
    return <FileAudio className={cn(className, 'text-pink-400')} strokeWidth={1.5} />;
  }
  if (mime.includes('zip') || mime.includes('rar') || /\.(zip|rar|7z|tar|gz)$/.test(name)) {
    return <FileArchive className={cn(className, 'text-amber-500')} strokeWidth={1.5} />;
  }
  if (
    mime.startsWith('text/') ||
    mime.includes('json') ||
    /\.(js|ts|tsx|jsx|json|html|css|md|txt)$/.test(name)
  ) {
    return <FileCode className={cn(className, 'text-teal-400')} strokeWidth={1.5} />;
  }
  return <File className={cn(className, 'text-zinc-400')} strokeWidth={1.5} />;
}

/** Label like "JPEG" / "PDF" / "Folder" for grid metadata */
export function fileTypeLabel(item: DriveItem): string {
  if (item.type === 'FOLDER') return 'Folder';
  const mime = (item.mimeType || '').toLowerCase();
  const name = item.name;
  const ext = name.includes('.') ? name.slice(name.lastIndexOf('.') + 1).toUpperCase() : '';

  if (mime.includes('jpeg') || mime === 'image/jpg' || ext === 'JPG' || ext === 'JPEG') return 'JPEG';
  if (mime === 'image/png' || ext === 'PNG') return 'PNG';
  if (mime.includes('pdf') || ext === 'PDF') return 'PDF';
  if (mime.includes('word') || mime.includes('msword') || ext === 'DOC' || ext === 'DOCX') return ext || 'DOC';
  if (mime.includes('sheet') || mime.includes('excel') || ext === 'XLS' || ext === 'XLSX') return ext || 'XLS';
  if (mime.startsWith('image/') && ext) return ext;
  if (ext) return ext;
  if (mime.includes('/')) return mime.split('/')[1].toUpperCase();
  return 'FILE';
}
