import type { FileLike } from "./file_upload_service.js";

/**
 * Picks a file on platforms without an `<input type="file">` (React Native):
 * the host installs an implementation (camera, document picker…); without
 * one, the native document brick only shows an existing reading.
 */
export interface FilePickOptions {
  /** Accepted types, as an `accept` string (`image/*,.pdf`). */
  accept?: string;
  /** Prefer the camera when the platform has one. */
  capture?: boolean;
}

export interface FilePickerService {
  pick(options?: FilePickOptions): Promise<FileLike | undefined>;
}
