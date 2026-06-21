"use client";

import Image from "next/image";
import type { CSSProperties, SyntheticEvent } from "react";

type Crop = {
  color: string;
  x: number;
  y: number;
  size: number;
};

type Props = {
  src: string;
  alt: string;
  productName: string;
  sku?: string | null;
  sizes: string;
  priority?: boolean;
  frameClassName?: string;
  imageClassName?: string;
  onError?: (event: SyntheticEvent<HTMLImageElement>) => void;
};

const SHARED_COLOR_IMAGE = "/uploads/products/vibrador-sexy-controle-cores.png";

const COLOR_CROPS: Record<string, Crop> = {
  "3104000004756": { color: "preto", x: 390, y: 500, size: 205 },
  "3104000004755": { color: "rosa", x: 590, y: 500, size: 205 },
  "3104000004754": { color: "marrom", x: 0, y: 500, size: 205 },
  "3104000004753": { color: "branco", x: 300, y: 100, size: 465 },
  "3104000004752": { color: "vermelho", x: 195, y: 500, size: 205 },
};

export default function ProductVariantImage({
  src,
  alt,
  productName,
  sku,
  sizes,
  priority = false,
  frameClassName = "",
  imageClassName = "object-contain",
  onError,
}: Props) {
  const crop = getColorCrop(src, sku, productName);

  return (
    <span
      className={`relative block overflow-hidden ${frameClassName}`}
      data-product-color={crop?.color}
    >
      <Image
        src={src}
        alt={alt}
        width={800}
        height={800}
        sizes={sizes}
        priority={priority}
        onError={onError}
        className={crop ? "absolute max-w-none" : `h-full w-full ${imageClassName}`}
        style={crop ? cropStyle(crop) : undefined}
      />
    </span>
  );
}

function getColorCrop(src: string, sku: string | null | undefined, productName: string) {
  if (src.split(/[?#]/)[0] !== SHARED_COLOR_IMAGE) return null;

  const skuCrop = sku ? COLOR_CROPS[String(sku).trim()] : null;
  if (skuCrop) return skuCrop;

  const normalizedName = productName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  return Object.values(COLOR_CROPS).find((item) => normalizedName.includes(item.color)) ?? null;
}

function cropStyle(crop: Crop): CSSProperties {
  const scale = 800 / crop.size;

  return {
    width: `${scale * 100}%`,
    height: `${scale * 100}%`,
    left: `${-(crop.x / crop.size) * 100}%`,
    top: `${-(crop.y / crop.size) * 100}%`,
  };
}
