import { Metadata } from "next";

export function StructuredData() {
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Novel Editor",
    description: "专业的长篇小说写作工具",
    url: "https://novel-editor.com",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: "https://novel-editor.com/search?q={search_term_string}",
      },
      "query-input": "required name=search_term_string",
    },
  };

  const softwareApplicationSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Novel Editor",
    applicationCategory: "WritingApplication",
    operatingSystem: ["Linux", "Windows", "macOS"],
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    description:
      "Novel Editor 是一款基于 Tauri 构建的跨平台桌面写作应用，专为长篇小说创作而设计。",
    featureList: [
      "沉浸式写作",
      "树形大纲",
      "全局搜索",
      "角色管理",
      "自动备份",
      "离线优先",
    ],
  };

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Novel Editor",
    url: "https://novel-editor.com",
    logo: "https://novel-editor.com/logo.png",
    sameAs: [
      "https://github.com/jeasoncc/novel-editor",
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(softwareApplicationSchema),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
    </>
  );
}

