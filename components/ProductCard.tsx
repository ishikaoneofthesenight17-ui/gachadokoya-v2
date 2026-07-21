import Link from "next/link";
import { GachaImage } from "@/components/ui/GachaImage";
import type { Product } from "@/lib/domain/types";

export function ProductCard({ product }: { product: Product }) {
  const release = product.release_period || product.release_month;
  return (
    <Link href={`/products/${product.id}`} className="flex gap-4 rounded-3xl bg-white p-4 shadow">
      <div className="grid h-28 w-28 shrink-0 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-yellow-50 to-pink-50">
        {product.image_url ? <GachaImage src={product.image_url} alt={product.name} className="h-full w-full object-contain" /> : <span className="text-4xl">🎁</span>}
      </div>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-3 font-black leading-6">{product.name}</p>
        {product.maker && <p className="mt-2 text-xs font-bold text-zinc-500">{product.maker}</p>}
        <div className="mt-3 flex flex-wrap gap-2 text-xs font-black">
          {typeof product.price === "number" && <span className="rounded-full bg-yellow-100 px-3 py-1">{product.price.toLocaleString("ja-JP")}円</span>}
          {release && <span className="rounded-full bg-zinc-100 px-3 py-1 text-zinc-600">{release}</span>}
        </div>
      </div>
    </Link>
  );
}
