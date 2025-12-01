// 底部抽屉组件 - 类似 Chrome DevTools 的交互

import {
	BookOpen,
	GripHorizontal,
	ListTree,
	Maximize2,
	Minimize2,
	TrendingUp,
	Users,
	X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { type BottomDrawerView, useUIStore } from "@/stores/ui";

interface BottomDrawerProps {
	children?: React.ReactNode;
}

const viewConfig: Record<
	BottomDrawerView & string,
	{ icon: React.ReactNode; label: string }
> = {
	outline: { icon: <ListTree className="size-4" />, label: "大纲" },
	characters: { icon: <Users className="size-4" />, label: "角色" },
	world: { icon: <BookOpen className="size-4" />, label: "世界观" },
	statistics: { icon: <TrendingUp className="size-4" />, label: "统计" },
};

export function BottomDrawer({ children }: BottomDrawerProps) {
	const {
		bottomDrawerOpen,
		bottomDrawerView,
		bottomDrawerHeight,
		setBottomDrawerOpen,
		setBottomDrawerView,
		setBottomDrawerHeight,
	} = useUIStore();

	const [isMaximized, setIsMaximized] = useState(false);
	const [prevHeight, setPrevHeight] = useState(bottomDrawerHeight);
	const drawerRef = useRef<HTMLDivElement>(null);
	const isDragging = useRef(false);
	const startY = useRef(0);
	const startHeight = useRef(0);

	// 拖拽调整高度
	const handleMouseDown = useCallback(
		(e: React.MouseEvent) => {
			e.preventDefault();
			isDragging.current = true;
			startY.current = e.clientY;
			startHeight.current = bottomDrawerHeight;
			document.body.style.cursor = "ns-resize";
			document.body.style.userSelect = "none";
		},
		[bottomDrawerHeight],
	);

	useEffect(() => {
		const handleMouseMove = (e: MouseEvent) => {
			if (!isDragging.current) return;
			const delta = startY.current - e.clientY;
			const newHeight = startHeight.current + delta;
			setBottomDrawerHeight(newHeight);
			setIsMaximized(false);
		};

		const handleMouseUp = () => {
			isDragging.current = false;
			document.body.style.cursor = "";
			document.body.style.userSelect = "";
		};

		document.addEventListener("mousemove", handleMouseMove);
		document.addEventListener("mouseup", handleMouseUp);
		return () => {
			document.removeEventListener("mousemove", handleMouseMove);
			document.removeEventListener("mouseup", handleMouseUp);
		};
	}, [setBottomDrawerHeight]);

	// 最大化/还原
	const toggleMaximize = useCallback(() => {
		if (isMaximized) {
			setBottomDrawerHeight(prevHeight);
			setIsMaximized(false);
		} else {
			setPrevHeight(bottomDrawerHeight);
			setBottomDrawerHeight(window.innerHeight * 0.7);
			setIsMaximized(true);
		}
	}, [isMaximized, bottomDrawerHeight, prevHeight, setBottomDrawerHeight]);

	// 关闭抽屉
	const handleClose = useCallback(() => {
		setBottomDrawerOpen(false);
	}, [setBottomDrawerOpen]);

	// 切换视图
	const handleViewChange = useCallback(
		(view: BottomDrawerView) => {
			setBottomDrawerView(view);
		},
		[setBottomDrawerView],
	);

	// 键盘快捷键: Escape 关闭
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape" && bottomDrawerOpen) {
				handleClose();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [bottomDrawerOpen, handleClose]);

	const currentHeight = isMaximized
		? window.innerHeight * 0.7
		: bottomDrawerHeight;

	return (
		<TooltipProvider>
			<div
				ref={drawerRef}
				className={cn(
					"bottom-drawer fixed bottom-0 z-40 bg-background shadow-lg",
					"transition-all duration-200 ease-out",
					bottomDrawerOpen
						? "translate-y-0 opacity-100 pointer-events-auto"
						: "translate-y-full opacity-0 pointer-events-none",
				)}
				style={{
					height: currentHeight,
					// 活动栏 48px + 侧边栏 16rem
					left: "calc(48px + 16rem)",
					right: 0,
				}}
			>
				{/* 拖拽手柄 */}
				<div
					className="absolute top-0 left-0 right-0 h-1.5 cursor-ns-resize group hover:bg-primary/20 transition-colors"
					onMouseDown={handleMouseDown}
				>
					<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
						<GripHorizontal className="size-4 text-muted-foreground" />
					</div>
				</div>

				{/* 标签栏 */}
				<div className="flex items-center h-9 px-2 border-b border-border/20 bg-muted/20">
					<div className="flex items-center gap-0.5">
						{(Object.keys(viewConfig) as BottomDrawerView[]).map((view) => {
							if (!view) return null;
							const config = viewConfig[view];
							return (
								<button
									key={view}
									onClick={() => handleViewChange(view)}
									className={cn(
										"flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-colors",
										bottomDrawerView === view
											? "bg-background text-foreground shadow-sm"
											: "text-muted-foreground hover:text-foreground hover:bg-background/50",
									)}
								>
									{config.icon}
									<span>{config.label}</span>
								</button>
							);
						})}
					</div>

					<div className="ml-auto flex items-center gap-1">
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant="ghost"
									size="icon"
									className="size-7"
									onClick={toggleMaximize}
								>
									{isMaximized ? (
										<Minimize2 className="size-3.5" />
									) : (
										<Maximize2 className="size-3.5" />
									)}
								</Button>
							</TooltipTrigger>
							<TooltipContent side="top">
								{isMaximized ? "还原" : "最大化"}
							</TooltipContent>
						</Tooltip>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant="ghost"
									size="icon"
									className="size-7"
									onClick={handleClose}
								>
									<X className="size-3.5" />
								</Button>
							</TooltipTrigger>
							<TooltipContent side="top">关闭 (Esc)</TooltipContent>
						</Tooltip>
					</div>
				</div>

				{/* 内容区域 */}
				<ScrollArea className="h-[calc(100%-2.25rem)]">
					<div className="p-4">{children}</div>
				</ScrollArea>
			</div>
		</TooltipProvider>
	);
}
