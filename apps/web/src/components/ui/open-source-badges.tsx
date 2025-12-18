"use client";

import { Github, Shield, Code } from "lucide-react";
import Link from "next/link";

interface OpenSourceBadgesProps {
  className?: string;
}

export function OpenSourceBadges({ className }: OpenSourceBadgesProps) {
  const badges = [
    {
      name: "MIT License",
      icon: <Shield className="w-4 h-4" />,
      href: "/license",
      text: "MIT License",
      description: "Open source license",
    },
    {
      name: "GitHub",
      icon: <Github className="w-4 h-4" />,
      href: "https://github.com/jeasoncc/grain",
      text: "View on GitHub",
      description: "View source code",
    },
    {
      name: "Contributions",
      icon: <Code className="w-4 h-4" />,
      href: "/docs/contributing",
      text: "Contributing",
      description: "Join us",
    },
  ];

  return (
    <div className={`flex flex-wrap items-center gap-4 ${className || ""}`}>
      {badges.map((badge) => (
        <Link
          key={badge.name}
          href={badge.href}
          target={badge.href.startsWith("http") ? "_blank" : undefined}
          rel={badge.href.startsWith("http") ? "noopener noreferrer" : undefined}
          className="group inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-black hover:border-gray-400 dark:hover:border-gray-600 transition-all duration-300 hover:shadow-md"
        >
          <div className="text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
            {badge.icon}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {badge.text}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {badge.description}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}


