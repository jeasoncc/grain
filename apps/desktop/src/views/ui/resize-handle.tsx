import { useCallback, useState } from "react";
import { cn } from "@/utils/cn.util";

interface ResizeHandleProps {
	onResize: (deltaX: number) => void;
	onResizeStart?: () => void;
	onResizeEnd?: () => void;
	position?: "left" | "right";
	className?: string;
}

export function ResizeHandle({
	onResize,
	onResizeStart,
	onResizeEnd,
	position = "right",
	className,
}: ResizeHandleProps) {
	const [isDragging, setIsDragging] = useState(false);

	const handleMouseDown = useCallback(
		(e: React.MouseEvent) => {
			e.preventDefault();
			e.stopPropagation();
			setIsDragging(true);
			onResizeStart?.();

			const startX = e.clientX;

			const handleMouseMove = (moveEvent: MouseEvent) => {
				const deltaX = moveEvent.clientX - startX;
				onResize(position === "right" ? deltaX : -deltaX);
			};

			const handleMouseUp = () => {
				setIsDragging(false);
				onResizeEnd?.();
				document.removeEventListener("mousemove", handleMouseMove);
				document.removeEventListener("mouseup", handleMouseUp);
				document.body.style.cursor = "";
				document.body.style.userSelect = "";
			};

			document.addEventListener("mousemove", handleMouseMove);
			document.addEventListener("mouseup", handleMouseUp);
			document.body.style.cursor = "col-resize";
			document.body.style.userSelect = "none";
		},
		[onResize, onResizeStart, onResizeEnd, position],
	);

	return (
		<div
			className={cn(
				"absolute top-0 bottom-0 w-1 cursor-col-resize z-50",
				"hover:bg-primary/20 transition-colors duration-150",
				"group",
				isDragging && "bg-primary/30",
				position === "right" ? "right-0" : "left-0",
				className,
			)}
			onMouseDown={handleMouseDown}
		>
			{/* Visual indicator line */}
			<div
				className={cn(
					"absolute top-0 bottom-0 w-px",
					"bg-transparent group-hover:bg-primary/40 transition-colors duration-150",
					isDragging && "bg-primary/60",
					position === "right" ? "right-0" : "left-0",
				)}
			/>
		</div>
	);
}
