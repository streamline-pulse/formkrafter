export interface FileLike {
  name: string;
  type: string;
  size: number;
  arrayBuffer(): Promise<ArrayBuffer>;
}

export interface UploadedFile {
  name: string;
  type: string;
  size: number;
  url: string;
}

export interface FileUploadService {
  upload(file: FileLike): Promise<UploadedFile>;
}

export class Base64FileUploadService implements FileUploadService {
  async upload(file: FileLike): Promise<UploadedFile> {
    const encode = (globalThis as { btoa?: (raw: string) => string }).btoa;
    if (!encode) throw new Error("No base64 encoder available");

    const bytes = new Uint8Array(await file.arrayBuffer());
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);

    return {
      name: file.name,
      type: file.type,
      size: file.size,
      url: `data:${file.type};base64,${encode(binary)}`,
    };
  }
}
