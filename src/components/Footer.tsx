"use client";

export default function Footer() {
  return (
    <footer className="relative z-10 px-8 py-10 border-t border-grid">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <span className="pixel-text text-[10px] tracking-[0.2em] text-ink/40 uppercase">
          OmniMind Nexus
        </span>
        <span className="pixel-text text-[10px] text-ink/35">
          A2A Agent-to-Agent Protocol &middot; &copy; 2026
        </span>
      </div>
    </footer>
  );
}