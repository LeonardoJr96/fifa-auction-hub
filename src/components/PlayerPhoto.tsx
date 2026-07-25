import { cn } from "@/lib/utils";

interface PlayerPhotoProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
}

/** Foto do jogador com fallback de silhueta quando photo_url vem null. */
export function PlayerPhoto({ src, alt, className }: PlayerPhotoProps) {
  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden rounded-full bg-muted",
        className,
      )}
    >
      {src ? (
        <img src={src} alt={alt} loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-2/3 w-2/3 text-muted-foreground">
          <path
            fill="currentColor"
            d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-4.4 0-8 2.6-8 5.8V22h16v-2.2c0-3.2-3.6-5.8-8-5.8Z"
          />
        </svg>
      )}
    </div>
  );
}
