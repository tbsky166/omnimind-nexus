"use client";

import { motion } from "framer-motion";

const links = [
  { label: "A2A Protocol", href: "#protocol" },
  { label: "Agents", href: "#agents" },
  { label: "Creator", href: "#creator" },
];

export default function Nav() {
  return (
    <motion.nav
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4 bg-transparent"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <span className="pixel-text text-[11px] tracking-[0.25em] text-ink/70 uppercase">
        OmniMind Nexus
      </span>
      <div className="flex items-center gap-8">
        {links.map((link) => (
          <a
            key={link.label}
            href={link.href}
            className="pixel-text text-[11px] tracking-[0.15em] text-ink/50 hover:text-ink uppercase transition-colors duration-200"
          >
            {link.label}
          </a>
        ))}
      </div>
    </motion.nav>
  );
}