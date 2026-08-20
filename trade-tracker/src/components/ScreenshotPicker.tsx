import { useRef } from 'react';

interface ScreenshotPickerProps {
  id: string;
  label: string;
  disabled?: boolean;
  onPick: (image: File) => void;
}

/**
 * Picking a screenshot off the phone. Its own component because a file input
 * is the one field in this app that cannot be controlled by its value — the
 * browser owns it — so clearing it after a picture is used takes a ref, and
 * every place that offers one needs the same trick.
 *
 * `accept` keeps the picker to pictures. It is a convenience and not a check:
 * whether the file is an image is decided in the core, on the type the
 * operating system attached, and never by opening it (ADR-0003).
 */
export default function ScreenshotPicker({ id, label, disabled, onPick }: ScreenshotPickerProps) {
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
        accept="image/*"
        disabled={disabled}
        onChange={(event) => {
          const image = event.target.files?.[0];
          // Cleared straight away, so picking the same file twice — after a
          // rejection, say — still counts as picking it.
          if (input.current) input.current.value = '';
          if (image) onPick(image);
        }}
      />
    </p>
  );
}
