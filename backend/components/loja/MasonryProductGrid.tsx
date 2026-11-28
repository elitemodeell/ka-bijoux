import { Children, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  itemClassName?: string;
  desktopColumns?: 3 | 4 | 5;
};

/** Native CSS multi-column flow provides true independent masonry columns without JS positioning. */
export default function MasonryProductGrid({
  children,
  className = "",
  itemClassName = "",
  desktopColumns = 4,
}: Props) {
  const desktop = desktopColumns === 3 ? "lg:columns-3" : desktopColumns === 5 ? "xl:columns-5" : "lg:columns-4";

  return (
    <div className={`ka-product-masonry columns-2 gap-[7px] sm:columns-3 sm:gap-2 ${desktop} ${className}`}>
      {Children.toArray(children).map((child, index) => (
        <div key={index} className={`ka-product-masonry-item mb-[7px] break-inside-avoid sm:mb-2 ${itemClassName}`}>
          {child}
        </div>
      ))}
    </div>
  );
}
