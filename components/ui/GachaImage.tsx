import Image, { type ImageProps } from "next/image";

type GachaImageProps = Omit<ImageProps, "width" | "height" | "alt"> & {
  alt: string;
  width?: number;
  height?: number;
};

/** Shared wrapper for deployment-specific Supabase URLs and local assets. */
export function GachaImage({ alt, width = 800, height = 800, ...props }: GachaImageProps) {
  // Keep optimization off until every deployment's storage hostname is allowlisted.
  return <Image {...props} alt={alt} width={width} height={height} unoptimized />;
}
