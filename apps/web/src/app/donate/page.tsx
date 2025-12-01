import { DonatePageContent } from "./donate-content";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "支持 Novel Editor",
  description: "支持 Novel Editor - 通过微信或支付宝为项目提供支持，帮助我们持续改进",
};

export default function DonatePage() {
  return <DonatePageContent />;
}
