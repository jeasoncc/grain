import Link from "next/link";
import { FileText, Github, Mail, MessageSquare, Code } from "lucide-react";
import { OpenSourceBadges } from "@/components/ui/open-source-badges";

const footerLinks = {
  product: [
    { name: "Features", href: "/#features" },
    { name: "Download", href: "/download" },
    { name: "Changelog", href: "/#changelog" },
    { name: "Roadmap", href: "/#roadmap" },
  ],
  resources: [
    { name: "Docs", href: "/docs" },
    { name: "Tutorials", href: "/docs/tutorials" },
    { name: "API Reference", href: "/docs/api" },
    { name: "FAQ", href: "/docs/faq" },
  ],
  community: [
    { name: "GitHub", href: "https://github.com/jeasoncc/grain" },
    { name: "Discussions", href: "https://github.com/jeasoncc/grain/discussions" },
    { name: "Issues", href: "https://github.com/jeasoncc/grain/issues" },
    { name: "Contributing", href: "/docs/contributing" },
    { name: "Contributors", href: "/contributors" },
    { name: "Code of Conduct", href: "/conduct" },
  ],
  legal: [
    { name: "隐私政策", href: "/privacy" },
    { name: "使用条款", href: "/terms" },
    { name: "许可证", href: "/license" },
    { name: "安全政策", href: "/security" },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-gray-200 dark:border-gray-800/80 bg-white dark:bg-black">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-6 h-6 text-gray-900 dark:text-white" />
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                Grain
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              A minimalist writing sanctuary
            </p>
            <div className="flex gap-3">
              <a
                href="https://github.com/jeasoncc/grain"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition"
                aria-label="GitHub"
              >
                <Github className="w-5 h-5" />
              </a>
              <a
                href="mailto:support@grain.app"
                className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition"
                aria-label="Email"
              >
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Product */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
              Product
            </h3>
            <ul className="space-y-2">
              {footerLinks.product.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
              Resources
            </h3>
            <ul className="space-y-2">
              {footerLinks.resources.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Community */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
              Community
            </h3>
            <ul className="space-y-2">
              {footerLinks.community.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    target={link.href.startsWith("http") ? "_blank" : undefined}
                    rel={
                      link.href.startsWith("http")
                        ? "noopener noreferrer"
                        : undefined
                    }
                    className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
              Legal
            </h3>
            <ul className="space-y-2">
              {footerLinks.legal.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Open Source Badges */}
        <div className="pt-8 border-t border-gray-200 dark:border-gray-800 mb-8">
          <OpenSourceBadges className="justify-center" />
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-gray-200 dark:border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            © {new Date().getFullYear()} Grain. Released under the MIT License.
          </p>
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Code className="w-4 h-4" />
            <span>Made with ❤️ by the community</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

