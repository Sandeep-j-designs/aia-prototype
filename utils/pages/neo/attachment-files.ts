/**
 * The files behind attachments, by name (21 Oct 2026). A message keeps
 * only the attachment's name; a task that reads the file itself (an
 * edited recon report) finds it here.
 *
 * DEV: attachments upload to POST /api/neo/files and travel as IDs; the
 * server reads them, so this registry goes.
 */
const files = new Map<string, File>();

export const keepFile = (file: File) => files.set(file.name, file);
export const fileOf = (name: string) => files.get(name);
