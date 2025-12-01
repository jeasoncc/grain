import { Download, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { SectionHeader } from "@/components/ui/section-header";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { cn } from "@/lib/utils";

const platforms = [
  {
    name: "Linux",
    icon: "🐧",
    formats: [
      { name: "AppImage", extension: ".AppImage", size: "85 MB" },
      { name: "DEB", extension: ".deb", size: "82 MB" },
      { name: "RPM", extension: ".rpm", size: "84 MB" },
    ],
    version: "v0.1.0",
    popular: true,
  },
  {
    name: "Windows",
    icon: "🪟",
    formats: [
      { name: "MSI Installer", extension: ".msi", size: "88 MB" },
      { name: "Portable EXE", extension: ".exe", size: "87 MB" },
    ],
    version: "v0.1.0",
    popular: true,
  },
  {
    name: "macOS",
    icon: "🍎",
    formats: [
      { name: "DMG", extension: ".dmg", size: "86 MB" },
      { name: "Apple Silicon", extension: "-arm64.dmg", size: "83 MB" },
    ],
    version: "v0.1.0",
    popular: false,
  },
];

const requirements = [
  { platform: "Linux", req: "Ubuntu 20.04+, Fedora 34+, or equivalent" },
  { platform: "Windows", req: "Windows 10 64-bit or later" },
  { platform: "macOS", req: "macOS 11.0 (Big Sur) or later" },
];

export function DownloadSection() {
  return (
    <section
      id="download"
      className="py-24 md:py-32 bg-white dark:bg-gray-900"
    >
      <div className="container mx-auto px-4">
        <ScrollReveal>
          <SectionHeader
            title="下载 Novel Editor"
            description="选择适合你的平台，立即开始创作之旅"
            subtitle="Download"
          />
        </ScrollReveal>

        {/* Platform cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-16 max-w-5xl mx-auto">
          {platforms.map((platform, index) => (
            <ScrollReveal key={platform.name} direction="up" delay={index * 100}>
              <Card
                className={cn(
                  "relative",
                  platform.popular
                    ? "ring-2 ring-gray-900 dark:ring-gray-100"
                    : ""
                )}
              >
                {platform.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-semibold rounded-full z-10">
                    最受欢迎
                  </div>
                )}

                <CardHeader className="text-center pb-4">
                  <div className="text-5xl mb-3">{platform.icon}</div>
                  <CardTitle className="text-2xl">{platform.name}</CardTitle>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {platform.version}
                  </p>
                </CardHeader>
                <CardContent className="space-y-2">
                  {platform.formats.map((format) => (
                    <Button
                      key={format.name}
                      className="w-full justify-between group"
                      variant="outline"
                      asChild
                    >
                      <Link href="#">
                        <div className="flex flex-col items-start">
                          <span className="font-medium">{format.name}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {format.size}
                          </span>
                        </div>
                        <Download className="w-4 h-4" />
                      </Link>
                    </Button>
                  ))}
                </CardContent>
              </Card>
            </ScrollReveal>
          ))}
        </div>

        {/* System requirements */}
        <ScrollReveal direction="up" delay={400}>
          <div className="max-w-4xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <Check className="w-5 h-5" />
                  系统要求
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  {requirements.map((req) => (
                    <div
                      key={req.platform}
                      className="flex items-start gap-3 p-4 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-800"
                    >
                      <Check className="w-5 h-5 text-gray-700 dark:text-gray-300 mt-0.5 shrink-0" />
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white mb-1">
                          {req.platform}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {req.req}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
