"use client";

import { useState, useRef, useEffect, ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface LazyImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "width" | "height"> {
  src: string;
  alt: string;
  className?: string;
  placeholder?: "blur" | "empty";
  blurDataURL?: string;
  priority?: boolean;
  fill?: boolean;
  sizes?: string;
  width?: number;
  height?: number;
}

export function LazyImage({
  src,
  alt,
  className,
  placeholder = "empty",
  blurDataURL,
  priority = false,
  fill = false,
  sizes,
  ...props
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (priority || isInView) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: "50px",
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [priority, isInView]);

  if (fill) {
    return (
      <div ref={imgRef} className={cn("relative overflow-hidden", className)}>
        {isInView && (
          <Image
            src={src}
            alt={alt}
            fill
            sizes={sizes || "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"}
            className={cn(
              "object-cover transition-opacity duration-500",
              isLoaded ? "opacity-100" : "opacity-0"
            )}
            onLoad={() => setIsLoaded(true)}
            placeholder={placeholder}
            blurDataURL={blurDataURL}
            priority={priority}
            {...props}
          />
        )}
        {!isLoaded && (
          <div className="absolute inset-0 bg-gray-200 dark:bg-gray-800 animate-pulse" />
        )}
      </div>
    );
  }

  return (
    <div ref={imgRef} className={cn("relative overflow-hidden", className)}>
      {isInView ? (
        <Image
          src={src}
          alt={alt}
          width={props.width as number}
          height={props.height as number}
          className={cn(
            "transition-opacity duration-500",
            isLoaded ? "opacity-100" : "opacity-0"
          )}
          onLoad={() => setIsLoaded(true)}
          placeholder={placeholder}
          blurDataURL={blurDataURL}
          priority={priority}
          sizes={sizes}
          {...props}
        />
      ) : (
        <div
          className="w-full h-full bg-gray-200 dark:bg-gray-800 animate-pulse"
          style={{
            width: props.width as number,
            height: props.height as number,
          }}
        />
      )}
    </div>
  );
}








