import { useRef } from 'react';

interface FilePickerProps {
  id: string;
  label: string;
  /** What the phone's picker should offer — a screenshot, or a Backup. */
  accept: string;
  disabled?: boolean;
  onPick: (file: File) => void;
}

/**
 * Picking a file off the phone: a screenshot to attach, or a Backup to
 * restore. Its own component because a file input is the one field in this app
 * that cannot be controlled by its value — the browser owns it — so clearing
 * it after a file is used takes a ref, and every place that offers one needs
 * the same trick.
 *
 * `accept` is a convenience and never a check. Whether a screenshot is an
 * image is decided in the core, on the type the operating system attached, and
 * never by opening it (ADR-0003); whether a Backup is a Backup is decided by
 * reading the file, which is the only way to know.
 */
export default function FilePicker({ id, label, accept, disabled, onPick }: FilePickerProps) {
  const input = useRef<HTMLInputElement>(null);

  return (
    <p className="picker">
      <label className="picker__label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        ref={input}
        className="picker__input"
        type="file"
        accept={accept}
        disabled={disabled}
        onChange={(event) => {
          const file = event.target.files?.[0];
          // Cleared straight away, so picking the same file twice — after a
          // rejection, say — still counts as picking it.
          if (input.current) input.current.value = '';
          if (file) onPick(file);
        }}
      />
    </p>
  );
}
