import Image from "next/image";
import { cn } from "@/lib/utils";

export function BrandLogo({
  className,
  imageClassName,
  priority = false
}: {
  className?: string;
  imageClassName?: string;
  priority?: boolean;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <Image
        src="/brand/vcgl-logo.jpg"
        alt="VCGL - Vethan Concepts Group Ltd"
        width={1080}
        height={522}
        priority={priority}
        sizes="(max-width: 640px) 160px, 240px"
        className={cn("h-auto w-full object-contain", imageClassName)}
      />
    </div>
  );
}
