import { Metadata } from "next";

export function StructuredData() {
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Grain",
    description: "A minimalist writing sanctuary for long-form content",
    url: "https://grain.app",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: "https://grain.app/search?q={search_term_string}",
      },
      "query-input": "required name=search_term_string",
    },
  };

  const softwareApplicationSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Grain",
    applicationCategory: "WritingApplication",
    operatingSystem: ["Linux", "Windows", "macOS"],
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    description:
      "Grain is a minimalist writing sanctuary built with Tauri for long-form content creation.",
    featureList: [
      "Immersive writing",
      "Tree-based outline",
      "Global search",
      "Tag system",
      "Auto backup",
      "Offline first",
    ],
  };

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Grain",
    url: "https://grain.app",
    logo: "https://grain.app/logo.png",
    sameAs: [
      "https://github.com/jeasoncc/grain",
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

