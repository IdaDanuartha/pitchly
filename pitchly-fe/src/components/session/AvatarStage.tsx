"use client";

import { useState } from "react";

import { JudgeAvatar } from "@/components/session/JudgeAvatar";
import { avatarImage } from "@/components/session/avatars";

export function AvatarStage({
  persona,
  amplitude,
  speaking,
  size = 140,
}: {
  persona: string;
  amplitude: number;
  speaking: boolean;
  size?: number;
}) {
  const img = avatarImage(persona);
  const [failed, setFailed] = useState(false);

  if (!img || failed) {
    return (
      <JudgeAvatar
        persona={persona}
        amplitude={amplitude}
        speaking={speaking}
        size={size}
      />
    );
  }

  // Static portrait with a speaking "pulse" driven by audio amplitude.
  const scale = 1 + (speaking ? amplitude * 0.05 : 0);
  const glow = speaking ? amplitude : 0;

  return (
    <div
      style={{
        width: size,
        height: size,
        boxShadow: `0 0 ${8 + glow * 26}px ${glow * 6}px color-mix(in srgb, var(--color-spotlight-amber) ${Math.round(
          glow * 70,
        )}%, transparent)`,
      }}
      className={`relative overflow-hidden rounded-full border-2 bg-navy-soft transition-shadow ${
        speaking ? "border-spotlight-amber" : "border-navy-line"
      }`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={img}
        alt={persona}
        onError={() => setFailed(true)}
        style={{ transform: `scale(${scale})` }}
        className="h-full w-full object-cover transition-transform duration-75"
      />
      {speaking && (
        <span
          className="pointer-events-none absolute inset-x-0 bottom-0"
          style={{
            height: `${6 + amplitude * 14}px`,
            background:
              "linear-gradient(to top, color-mix(in srgb, var(--color-spotlight-amber) 55%, transparent), transparent)",
          }}
        />
      )}
    </div>
  );
}
