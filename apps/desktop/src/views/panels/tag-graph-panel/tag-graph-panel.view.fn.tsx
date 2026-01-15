/**
 * Tag Graph Panel View - 标签关系图谱面板展示组件
 *
 * 使用 Canvas 绘制标签关系图
 * 支持拖拽、缩放、点击交互
 *
 * 基于 nodes.tags 数组计算标签共现关系
 *
 * 纯展示组件：所有数据通过 props 传入，不直接访问 Store 或 DB
 */

import { Maximize2, ZoomIn, ZoomOut } from "lucide-react"
import { memo, useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/views/ui/button"
import type { TagGraphPanelViewProps } from "./tag-graph-panel.types"

interface GraphNode {
	readonly id: string
	readonly label: string
	readonly color: string
	readonly x: number
	readonly y: number
	readonly vx: number
	readonly vy: number
	readonly radius: number
}

interface GraphEdge {
	readonly source: string
	readonly target: string
	readonly weight: number
}

// 力导向图参数
const REPULSION = 5000
const ATTRACTION = 0.01
const DAMPING = 0.9
const MIN_DISTANCE = 80

/**
 * TagGraphPanelView - 标签图谱面板纯展示组件
 *
 * 纯展示组件：所有数据通过 props 传入
 */
export const TagGraphPanelView = memo(({ workspaceId, graphData }: TagGraphPanelViewProps) => {
	const canvasRef = useRef<HTMLCanvasElement>(null)
	const containerRef = useRef<HTMLDivElement>(null)
	const animationRef = useRef<number>(0)

	const [nodes, setNodes] = useState<readonly GraphNode[]>([])
	const [edges, setEdges] = useState<readonly GraphEdge[]>([])
	const [scale, setScale] = useState(1)
	const [offset, setOffset] = useState({ x: 0, y: 0 })
	const [dragging, setDragging] = useState<string | null>(null)
	const [panning, setPanning] = useState(false)
	const [lastMouse, setLastMouse] = useState({ x: 0, y: 0 })

	// 初始化节点位置
	useEffect(() => {
		if (!graphData || !containerRef.current) return

		const { width, height } = containerRef.current.getBoundingClientRect()
		const centerX = width / 2
		const centerY = height / 2

		// 生成颜色 - 基于标签名称的哈希
		const getColor = (name: string) => {
			let hash = 0
			for (let i = 0; i < name.length; i++) {
				hash = name.charCodeAt(i) + ((hash << 5) - hash)
			}
			const hue = Math.abs(hash % 360)
			return `hsl(${hue}, 60%, 50%)`
		}

		const newNodes: GraphNode[] = graphData.nodes.map((node, i) => {
			const angle = (2 * Math.PI * i) / graphData.nodes.length
			const radius = Math.min(width, height) * 0.3
			return {
				color: getColor(node.name),
				id: node.id,
				label: node.name,
				radius: 20 + Math.min(node.count * 2, 20),
				vx: 0,
				vy: 0,
				x: centerX + radius * Math.cos(angle),
				y: centerY + radius * Math.sin(angle),
			}
		})

		const newEdges: GraphEdge[] = graphData.edges.map((edge) => ({
			source: edge.source,
			target: edge.target,
			weight: edge.weight,
		}))

		setNodes(newNodes)
		setEdges(newEdges)
	}, [graphData])

	// 力导向布局
	const simulate = useCallback(() => {
		if (nodes.length === 0) return

		setNodes((prevNodes) => {
			const newNodes = prevNodes.map((node) => ({ ...node }))

			// 计算斥力
			for (let i = 0; i < newNodes.length; i++) {
				for (let j = i + 1; j < newNodes.length; j++) {
					const dx = newNodes[j].x - newNodes[i].x
					const dy = newNodes[j].y - newNodes[i].y
					const dist = Math.max(Math.sqrt(dx * dx + dy * dy), MIN_DISTANCE)
					const force = REPULSION / (dist * dist)

					const fx = (dx / dist) * force
					const fy = (dy / dist) * force

					const updatedI = { ...newNodes[i], vx: newNodes[i].vx - fx, vy: newNodes[i].vy - fy }
					const updatedJ = { ...newNodes[j], vx: newNodes[j].vx + fx, vy: newNodes[j].vy + fy }

					newNodes[i] = updatedI
					newNodes[j] = updatedJ
				}
			}

			// 计算引力（边）
			const nodesWithAttraction = [...newNodes]
			for (const edge of edges) {
				const sourceIndex = nodesWithAttraction.findIndex((n) => n.id === edge.source)
				const targetIndex = nodesWithAttraction.findIndex((n) => n.id === edge.target)
				if (sourceIndex === -1 || targetIndex === -1) continue

				const source = nodesWithAttraction[sourceIndex]
				const target = nodesWithAttraction[targetIndex]

				const dx = target.x - source.x
				const dy = target.y - source.y
				const dist = Math.sqrt(dx * dx + dy * dy)

				const force = dist * ATTRACTION * (edge.weight / 50)
				const fx = (dx / dist) * force
				const fy = (dy / dist) * force

				nodesWithAttraction[sourceIndex] = { ...source, vx: source.vx + fx, vy: source.vy + fy }
				nodesWithAttraction[targetIndex] = { ...target, vx: target.vx - fx, vy: target.vy - fy }
			}

			// 应用速度和阻尼
			return nodesWithAttraction.map((node) => {
				if (node.id === dragging) return node

				const dampedVx = node.vx * DAMPING
				const dampedVy = node.vy * DAMPING
				return {
					...node,
					vx: dampedVx,
					vy: dampedVy,
					x: node.x + dampedVx,
					y: node.y + dampedVy,
				}
			})
		})
	}, [nodes.length, edges, dragging])

	// 动画循环
	useEffect(() => {
		const animate = () => {
			simulate()
			animationRef.current = requestAnimationFrame(animate)
		}

		animationRef.current = requestAnimationFrame(animate)

		return () => {
			if (animationRef.current) {
				cancelAnimationFrame(animationRef.current)
			}
		}
	}, [simulate])

	// 绘制
	useEffect(() => {
		const canvas = canvasRef.current
		if (!canvas) return

		const ctx = canvas.getContext("2d")
		if (!ctx) return

		const { width, height } = canvas
		ctx.clearRect(0, 0, width, height)

		ctx.save()
		ctx.translate(offset.x, offset.y)
		ctx.scale(scale, scale)

		// 绘制边
		ctx.strokeStyle = "#e5e5e5"
		ctx.lineWidth = 1
		for (const edge of edges) {
			const source = nodes.find((n) => n.id === edge.source)
			const target = nodes.find((n) => n.id === edge.target)
			if (!source || !target) continue

			ctx.beginPath()
			ctx.moveTo(source.x, source.y)
			ctx.lineTo(target.x, target.y)
			ctx.stroke()
		}

		// 绘制节点
		for (const node of nodes) {
			// 节点圆
			ctx.beginPath()
			ctx.arc(node.x, node.y, node.radius, 0, 2 * Math.PI)
			ctx.fillStyle = `${node.color}40`
			ctx.fill()
			ctx.strokeStyle = node.color
			ctx.lineWidth = 2
			ctx.stroke()

			// 节点标签
			ctx.fillStyle = "#333"
			ctx.font = "12px sans-serif"
			ctx.textAlign = "center"
			ctx.textBaseline = "middle"
			ctx.fillText(node.label, node.x, node.y)
		}

		ctx.restore()
	}, [nodes, edges, scale, offset])

	// 调整 canvas 大小
	useEffect(() => {
		const container = containerRef.current
		const canvas = canvasRef.current
		if (!container || !canvas) return

		const resize = () => {
			const { width, height } = container.getBoundingClientRect()
			canvas.width = width
			canvas.height = height
		}

		resize()
		window.addEventListener("resize", resize)
		return () => window.removeEventListener("resize", resize)
	}, [])

	// 鼠标事件
	const handleMouseDown = (e: React.MouseEvent) => {
		const canvas = canvasRef.current
		if (!canvas) return

		const rect = canvas.getBoundingClientRect()
		const x = (e.clientX - rect.left - offset.x) / scale
		const y = (e.clientY - rect.top - offset.y) / scale

		// 检查是否点击了节点
		for (const node of nodes) {
			const dx = x - node.x
			const dy = y - node.y
			if (dx * dx + dy * dy < node.radius * node.radius) {
				setDragging(node.id)
				return
			}
		}

		// 开始平移
		setPanning(true)
		setLastMouse({ x: e.clientX, y: e.clientY })
	}

	const handleMouseMove = (e: React.MouseEvent) => {
		if (dragging) {
			const canvas = canvasRef.current
			if (!canvas) return

			const rect = canvas.getBoundingClientRect()
			const x = (e.clientX - rect.left - offset.x) / scale
			const y = (e.clientY - rect.top - offset.y) / scale

			setNodes((prev) =>
				prev.map((node) => (node.id === dragging ? { ...node, vx: 0, vy: 0, x, y } : node)),
			)
		} else if (panning) {
			const dx = e.clientX - lastMouse.x
			const dy = e.clientY - lastMouse.y
			setOffset((prev) => ({ ...prev, x: prev.x + dx, y: prev.y + dy }))
			setLastMouse({ x: e.clientX, y: e.clientY })
		}
	}

	const handleMouseUp = () => {
		setDragging(null)
		setPanning(false)
	}

	const handleWheel = (e: React.WheelEvent) => {
		e.preventDefault()
		const delta = e.deltaY > 0 ? 0.9 : 1.1
		setScale((prev) => Math.max(0.1, Math.min(3, prev * delta)))
	}

	const resetView = () => {
		setScale(1)
		setOffset({ x: 0, y: 0 })
	}

	if (!workspaceId) {
		return (
			<div className="flex items-center justify-center h-full text-muted-foreground">
				Please select a workspace first
			</div>
		)
	}

	if (!graphData || graphData.nodes.length === 0) {
		return (
			<div className="flex items-center justify-center h-full text-muted-foreground">
				No tag data available
			</div>
		)
	}

	return (
		<div className="flex flex-col h-full">
			{/* Toolbar */}
			<div className="flex items-center gap-2 p-2 border-b">
				<Button variant="ghost" size="icon" onClick={() => setScale((s) => Math.min(3, s * 1.2))}>
					<ZoomIn className="size-4" />
				</Button>
				<Button variant="ghost" size="icon" onClick={() => setScale((s) => Math.max(0.1, s * 0.8))}>
					<ZoomOut className="size-4" />
				</Button>
				<Button variant="ghost" size="icon" onClick={resetView}>
					<Maximize2 className="size-4" />
				</Button>
				<span className="text-xs text-muted-foreground ml-auto">{Math.round(scale * 100)}%</span>
			</div>

			{/* Canvas */}
			<div ref={containerRef} className="flex-1 relative overflow-hidden">
				<canvas
					ref={canvasRef}
					className="absolute inset-0 cursor-grab active:cursor-grabbing"
					onMouseDown={handleMouseDown}
					onMouseMove={handleMouseMove}
					onMouseUp={handleMouseUp}
					onMouseLeave={handleMouseUp}
					onWheel={handleWheel}
				/>
			</div>
		</div>
	)
})

TagGraphPanelView.displayName = "TagGraphPanelView"
