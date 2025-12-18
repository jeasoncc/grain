"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { FileText, Menu, X, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { smoothScrollTo } from "@/lib/smooth-scroll";

const navLinks = [
  { name: "Download", href: "/download" },
  { name: "Docs", href: "/docs" },
  { name: "About", href: "/about" },
  { name: "Donate", href: "/donate" },
];

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();

  // 优化滚动事件处理，使用节流
  useEffect(() => {
    let ticking = false;
    
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setIsScrolled(window.scrollY > 20);
          ticking = false;
        });
        ticking = true;
      }
    };
    
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // 防止水合不匹配
  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    const currentTheme = resolvedTheme || theme;
    setTheme(currentTheme === "dark" ? "light" : "dark");
  };

  const currentTheme = resolvedTheme || theme;

  // 防止闪烁，等待组件挂载后再显示主题切换按钮
  if (!mounted) {
    return (
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
          isScrolled
            ? "bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 shadow-sm"
            : "bg-transparent",
          "supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-gray-900/60"
        )}
      >
        <nav className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-3 text-gray-900 dark:text-white hover:opacity-90 transition-all duration-300 group"
            >
              <div className="relative">
                <div className="absolute inset-0 rounded-lg bg-gray-200/50 dark:bg-gray-700/50 blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <FileText className="w-8 h-8 text-gray-900 dark:text-white relative z-10 group-hover:scale-110 transition-transform duration-300" />
              </div>
              <span className="text-xl font-bold tracking-tight">Grain</span>
            </Link>
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className="relative px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-all duration-300 font-medium rounded-lg group/nav"
                >
                  <span className="relative z-10">{link.name}</span>
                  <span className="absolute inset-0 bg-gray-100 dark:bg-gray-800 rounded-lg opacity-0 group-hover/nav:opacity-100 transition-opacity duration-300"></span>
                </Link>
              ))}
              <a
                href="https://github.com/jeasoncc/grain"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition font-medium"
              >
                GitHub
              </a>
              <div className="w-10 h-10" /> {/* placeholder */}
            </div>
            <div className="md:hidden flex items-center gap-2">
              <div className="w-10 h-10" /> {/* 占位符 */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label="Toggle menu"
              >
                <Menu className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </nav>
      </header>
    );
  }

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        isScrolled
          ? "bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800/80 shadow-sm"
          : "bg-transparent",
        "supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-black/60"
      )}
    >
      <nav className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-3 text-gray-900 dark:text-white hover:opacity-90 transition-all duration-300 group"
          >
            <div className="relative">
              <div className="absolute inset-0 rounded-lg bg-gray-200/50 dark:bg-gray-700/50 blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <FileText className="w-8 h-8 text-gray-900 dark:text-white relative z-10 group-hover:scale-110 transition-transform duration-300" />
            </div>
            <span className="text-xl font-bold tracking-tight">Grain</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isHashLink = link.href.startsWith("#");
              const handleClick = isHashLink
                ? (e: React.MouseEvent<HTMLAnchorElement>) => {
                    e.preventDefault();
                    const id = link.href.substring(1);
                    smoothScrollTo(id, 80); // 80px offset for header
                  }
                : undefined;

              return (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={handleClick}
                  className="relative px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-all duration-300 font-medium rounded-lg group/nav"
                >
                  <span className="relative z-10">{link.name}</span>
                  <span className="absolute inset-0 bg-gray-100 dark:bg-gray-800 rounded-lg opacity-0 group-hover/nav:opacity-100 transition-opacity duration-300"></span>
                </Link>
              );
            })}
            <a
              href="https://github.com/jeasoncc/grain"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition font-medium"
            >
              GitHub
            </a>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              {currentTheme === "dark" ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </Button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              {currentTheme === "dark" ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden mt-4 pb-4 border-t border-gray-200 dark:border-gray-800 pt-4">
            <div className="flex flex-col gap-4">
              {navLinks.map((link) => {
                const isHashLink = link.href.startsWith("#");
                const handleClick = isHashLink
                  ? (e: React.MouseEvent<HTMLAnchorElement>) => {
                      e.preventDefault();
                      setIsMobileMenuOpen(false);
                      const id = link.href.substring(1);
                      setTimeout(() => smoothScrollTo(id, 80), 100);
                    }
                  : () => setIsMobileMenuOpen(false);

                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    onClick={handleClick}
                    className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition font-medium"
                  >
                    {link.name}
                  </Link>
                );
              })}
              <a
                href="https://github.com/jeasoncc/grain"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition font-medium"
              >
                GitHub
              </a>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}

