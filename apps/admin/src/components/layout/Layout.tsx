import type { ReactNode } from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

interface LayoutProps {
	children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
	return (
		<div className="flex h-screen overflow-hidden">
			<Sidebar />
			<div className="flex flex-1 flex-col overflow-hidden">
				<Header />
				<main className="flex-1 overflow-y-auto bg-background">{children}</main>
			</div>
		</div>
	);
}
