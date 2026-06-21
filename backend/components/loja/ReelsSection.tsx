"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import AnimatedSection from "./AnimatedSection";

const FEATURED_VIDEO = "/videos/stories/novidade2.mp4";
const FEATURED_POSTER = "/images/stories/novidades-cover.jpg";

export default function ReelsSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [shouldLoadVideo, setShouldLoadVideo] = useState(false);
  const [videoError, setVideoError] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    if (!("IntersectionObserver" in window)) {
      setShouldLoadVideo(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setShouldLoadVideo(true);
        observer.disconnect();
      },
      { rootMargin: "320px 0px" }
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  if (videoError) return null;

  return (
    <section ref={sectionRef} className="bg-white py-14 sm:py-20" aria-labelledby="featured-video-title">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <AnimatedSection className="mb-8 text-center sm:mb-10">
          <span className="mb-3 block text-sm font-semibold uppercase tracking-widest text-pink-500">
            Novidades
          </span>
          <h2 id="featured-video-title" className="font-playfair text-3xl font-bold text-gray-900 sm:text-4xl">
            Nossa coleção em detalhes
          </h2>
          <div className="ka-divider mx-auto mt-4" />
        </AnimatedSection>

        <AnimatedSection direction="scale">
          <div className="relative mx-auto aspect-[9/16] max-h-[680px] w-full max-w-[430px] overflow-hidden rounded-[24px] bg-pink-50 shadow-[0_20px_50px_rgba(255,77,109,0.16)]">
            {shouldLoadVideo ? (
              <video
                src={FEATURED_VIDEO}
                poster={FEATURED_POSTER}
                playsInline
                controls
                preload="metadata"
                className="h-full w-full object-cover"
                onError={() => setVideoError(true)}
              />
            ) : (
              <Image
                src={FEATURED_POSTER}
                alt="Novidades KA Bijoux"
                fill
                sizes="(max-width: 480px) 100vw, 430px"
                className="object-cover"
              />
            )}
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
