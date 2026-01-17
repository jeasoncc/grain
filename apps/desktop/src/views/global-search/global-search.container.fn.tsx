/**
 * Global Search 容器组件
 *
 * 负责搜索逻辑、状态管理和业务操作
 */

import { useNavigate } from "@tanstack/react-router"
import { memo, useCallback, useEffect, useState } from "react"
import { searchEngine } from "@/flows/search"
import type { GlobalSearchContainerProps, SearchResult } from "./global-search.types"
import { GlobalSearchView } from "./global-search.view.fn"

/**
 * Global Search 容器组件
 *
 * 负责：
 * - 搜索状态管理（query, results, loading, selectedIndex）
 * - 防抖搜索逻辑
 * - 键盘导航
 * - 结果选择和路由跳转
 */
export const GlobalSearchContainer = memo(({ open, onOpenChange }: GlobalSearchContainerProps) => {
	const [query, setQuery] = useState("")
	const [results, setResults] = useState<SearchResult[]>([])
	const [loading, setLoading] = useState(false)
	const [selectedIndex, setSelectedIndex] = useState(0)
	const navigate = useNavigate()

	// 执行搜索
	const performSearch = useCallback(async (searchQuery: string) => {
		if (!searchQuery.trim()) {
			setResults([])
			return
		}

		setLoading(true)
		try {
			console.log("[GlobalSearch] 开始搜索", { query: searchQuery })
			const searchResults = await searchEngine.simpleSearch(searchQuery, {
				limit: 30,
			})
			setResults([...searchResults])
			setSelectedIndex(0)
			console.log("[GlobalSearch] 搜索完成", {
				count: searchResults.length,
			})
		} catch (error) {
			console.error("[GlobalSearch] 搜索失败", error)
			setResults([])
		} finally {
			setLoading(false)
		}
	}, [])

	// 防抖搜索
	useEffect(() => {
		const timer = setTimeout(() => {
			performSearch(query)
		}, 300)

		return () => clearTimeout(timer)
	}, [query, performSearch])

	// 处理搜索关键词变化
	const handleQueryChange = useCallback((newQuery: string) => {
		setQuery(newQuery)
	}, [])

	// 处理结果选择
	const handleSelectResult = useCallback(
		(result: SearchResult) => {
			console.log("[GlobalSearch] 选择结果", {
				id: result.id,
				type: result.type,
			})

			onOpenChange(false)

			// 根据类型导航到对应页面
			switch (result.type) {
				case "node":
				case "project":
					// Navigate to Home，通过文件树打开
					navigate({ to: "/" })
					break
			}

			// 清空搜索
			setQuery("")
			setResults([])
		},
		[onOpenChange, navigate],
	)

	// 处理键盘事件
	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			switch (e.key) {
				case "ArrowDown":
					e.preventDefault()
					setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1))
					break
				case "ArrowUp":
					e.preventDefault()
					setSelectedIndex((prev) => Math.max(prev - 1, 0))
					break
				case "Enter":
					e.preventDefault()
					if (results[selectedIndex]) {
						handleSelectResult(results[selectedIndex])
					}
					break
				case "Escape":
					e.preventDefault()
					onOpenChange(false)
					break
			}
		},
		[results, selectedIndex, onOpenChange, handleSelectResult],
	)

	// 重置状态当对话框关闭时
	useEffect(() => {
		if (!open) {
			setQuery("")
			setResults([])
			setSelectedIndex(0)
		}
	}, [open])

	return (
		<GlobalSearchView
			open={open}
			query={query}
			results={results}
			loading={loading}
			selectedIndex={selectedIndex}
			onOpenChange={onOpenChange}
			onQueryChange={handleQueryChange}
			onSelectResult={handleSelectResult}
			onKeyDown={handleKeyDown}
		/>
	)
})

GlobalSearchContainer.displayName = "GlobalSearchContainer"
