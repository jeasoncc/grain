// 新手引导组件

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useState } from "react";
import logger from "@/log";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TourStep {
	target: string; // CSS selector
	title: string;
	description: string;
	position?: "top" | "bottom" | "left" | "right";
}

const TOUR_STEPS: TourStep[] = [
	{
		target: "[data-tour='activity-bar']",
		title: "活动栏",
		description: "这里可以快速访问书库、大纲、Wiki 知识库等功能",
		position: "right",
	},
	{
		target: "[data-tour='sidebar']",
		title: "侧边栏",
		description: "管理你的书籍项目，点击可以切换不同的书籍",
		position: "right",
	},
	{
		target: "[data-tour='editor']",
		title: "编辑器",
		description: "在这里开始写作，支持富文本编辑和专注模式",
		position: "top",
	},
	{
		target: "[data-tour='right-sidebar']",
		title: "章节导航",
		description: "快速浏览和切换章节、场景，支持拖拽排序",
		position: "left",
	},
	{
		target: "[data-tour='statusbar']",
		title: "状态栏",
		description: "查看字数统计和写作进度",
		position: "top",
	},
];

interface OnboardingTourProps {
	onComplete?: () => void;
}

export function OnboardingTour({ onComplete }: OnboardingTourProps) {
	const [currentStep, setCurrentStep] = useState(0);
	const [position, setPosition] = useState({ top: 0, left: 0 });
	const [show, setShow] = useState(false);

	useEffect(() => {
		// 检查是否已完成引导
		const completed = localStorage.getItem("onboarding-completed");
		if (completed) {
			return;
		}

		// 延迟显示，等待页面渲染
		const timer = setTimeout(() => {
			setShow(true);
			updatePosition();
		}, 500);

		return () => clearTimeout(timer);
	}, []);

	useEffect(() => {
		if (show) {
			updatePosition();
		}
	}, [currentStep, show]);

	const updatePosition = () => {
		const step = TOUR_STEPS[currentStep];
		const element = document.querySelector(step.target);

		if (!element) {
			logger.warn(`Tour target not found: ${step.target}`);
			return;
		}

		const rect = element.getBoundingClientRect();
		const tooltipWidth = 320;
		const tooltipHeight = 150;
		const offset = 16;

		let top = 0;
		let left = 0;

		switch (step.position) {
			case "right":
				top = rect.top + rect.height / 2 - tooltipHeight / 2;
				left = rect.right + offset;
				break;
			case "left":
				top = rect.top + rect.height / 2 - tooltipHeight / 2;
				left = rect.left - tooltipWidth - offset;
				break;
			case "top":
				top = rect.top - tooltipHeight - offset;
				left = rect.left + rect.width / 2 - tooltipWidth / 2;
				break;
			case "bottom":
				top = rect.bottom + offset;
				left = rect.left + rect.width / 2 - tooltipWidth / 2;
				break;
			default:
				top = rect.bottom + offset;
				left = rect.left;
		}

		// 确保不超出视口
		top = Math.max(
			offset,
			Math.min(top, window.innerHeight - tooltipHeight - offset),
		);
		left = Math.max(
			offset,
			Math.min(left, window.innerWidth - tooltipWidth - offset),
		);

		setPosition({ top, left });

		// 高亮目标元素
		element.classList.add("tour-highlight");
		return () => {
			element.classList.remove("tour-highlight");
		};
	};

	const handleNext = () => {
		if (currentStep < TOUR_STEPS.length - 1) {
			setCurrentStep(currentStep + 1);
		} else {
			handleComplete();
		}
	};

	const handlePrev = () => {
		if (currentStep > 0) {
			setCurrentStep(currentStep - 1);
		}
	};

	const handleComplete = () => {
		localStorage.setItem("onboarding-completed", "true");
		setShow(false);
		onComplete?.();
	};

	const handleSkip = () => {
		handleComplete();
	};

	if (!show) return null;

	const step = TOUR_STEPS[currentStep];

	return (
		<>
			{/* 遮罩层 */}
			<div
				className="fixed inset-0 bg-black/50 z-40 animate-fade-in"
				onClick={handleSkip}
			/>

			{/* 引导提示框 */}
			<div
				className="fixed z-50 w-80 rounded-lg border bg-card p-4 shadow-xl animate-slide-in"
				style={{ top: `${position.top}px`, left: `${position.left}px` }}
			>
				{/* 关闭按钮 */}
				<button
					onClick={handleSkip}
					className="absolute top-2 right-2 p-1 rounded hover:bg-muted transition-colors"
				>
					<X className="size-4 text-muted-foreground" />
				</button>

				{/* 内容 */}
				<div className="pr-6">
					<div className="flex items-center gap-2 mb-2">
						<div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">
							{currentStep + 1}
						</div>
						<h3 className="font-semibold text-sm">{step.title}</h3>
					</div>
					<p className="text-sm text-muted-foreground mb-4">
						{step.description}
					</p>

					{/* 进度指示器 */}
					<div className="flex gap-1 mb-4">
						{TOUR_STEPS.map((_, index) => (
							<div
								key={index}
								className={cn(
									"h-1 flex-1 rounded-full transition-colors",
									index <= currentStep ? "bg-primary" : "bg-muted",
								)}
							/>
						))}
					</div>

					{/* 按钮 */}
					<div className="flex items-center justify-between">
						<Button
							variant="ghost"
							size="sm"
							onClick={handleSkip}
							className="text-xs"
						>
							跳过引导
						</Button>
						<div className="flex gap-2">
							{currentStep > 0 && (
								<Button variant="outline" size="sm" onClick={handlePrev}>
									<ChevronLeft className="size-4" />
								</Button>
							)}
							<Button size="sm" onClick={handleNext}>
								{currentStep < TOUR_STEPS.length - 1 ? (
									<>
										下一步
										<ChevronRight className="size-4 ml-1" />
									</>
								) : (
									"完成"
								)}
							</Button>
						</div>
					</div>
				</div>
			</div>

			{/* 高亮样式 */}
			<style>{`
        .tour-highlight {
          position: relative;
          z-index: 45;
          box-shadow: 0 0 0 4px rgba(var(--primary), 0.3);
          border-radius: 4px;
          transition: box-shadow 0.3s ease;
        }
      `}</style>
		</>
	);
}
