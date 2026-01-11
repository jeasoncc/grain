// src/components/Spinner.tsx
import type React from "react";

interface SpinnerProps {
	size?: number; // 控制宽高，默认 8 (Tailwind 单位)
	color?: string; // Tailwind 颜色类名，默认 'text-orange-600'
	className?: string; // 额外 className
}

const Spinner: React.FC<SpinnerProps> = ({
	size = 8,
	color = "text-orange-600",
	className = "",
}) => {
	const sizeClass = `h-${size} w-${size}`;
	return (
		<svg
			className={`animate-spin ${sizeClass} ${color} ${className}`}
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			viewBox="0 0 24 24"
		>
			<circle
				className="opacity-25"
				cx="12"
				cy="12"
				r="10"
				stroke="currentColor"
				strokeWidth="4"
			/>
			<path
				className="opacity-75"
				fill="currentColor"
				d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
			/>
		</svg>
	);
};

export { Spinner };
