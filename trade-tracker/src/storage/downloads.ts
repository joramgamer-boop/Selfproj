/**
 * Handing a file to the browser to save.
 *
 * A port for the same reason the clock and durable storage are one: what
 * happens when a file is saved is the browser's business and cannot be
 * asserted on, so the app talks to an interface and the tests watch what was
 * handed over. It is also the seam where "the file exists" is decided, and the
 * Exported event is written only on the far side of it.
 */
export interface ExportFile {
  /** What the file is saved as. Carries the date, so Backups sort by name. */
  readonly filename: string;
  readonly mimeType: string;
  readonly text: string;
}

export interface Downloads {
  save(file: ExportFile): Promise<void>;
}

export function createDownloads(document: Document): Downloads {
  return {
    save: async ({ filename, mimeType, text }) => {
      // A blob URL rather than a data URL: a Backup with screenshots in it runs
      // to megabytes, and a data URL that long is refused by some browsers
      // outright.
      const url = URL.createObjectURL(new Blob([text], { type: mimeType }));
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      // Attached before the click and taken away after: a link that is not in
      // the document does not reliably download in every browser.
      document.body.append(link);
      link.click();
      link.remove();

      // Let go on the next turn rather than here. Some browsers — Safari above
      // all, which is the one this app is installed on — are still reading the
      // blob when the click returns, and revoking synchronously saves an empty
      // file.
      setTimeout(() => URL.revokeObjectURL(url), 0);
    },
  };
}

export const browserDownloads: Downloads = createDownloads(document);
