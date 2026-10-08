export type DriveItemType = 'FILE' | 'FOLDER';

export interface DriveFolder {
  id: string;
  name: string;
  parentId: string | null;
  ownerNik: string;
  description?: string | null;
  starred: boolean;
  trashedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  type: 'FOLDER';
  permission?: string;
  owner?: { nik: string; nama: string };
  sizeBytes?: string;
  itemCount?: number;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  bytes: string;
  dropboxPath: string;
  url?: string | null;
  folderId: string | null;
  ownerNik: string;
  description?: string | null;
  starred: boolean;
  trashedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  type: 'FILE';
  permission?: string;
  owner?: { nik: string; nama: string };
}

export interface DriveList {
  folders: DriveFolder[];
  files: DriveFile[];
}

export type DriveItem = DriveFolder | DriveFile;
