import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import {
	createColumnHelper,
	flexRender,
	getCoreRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	type SortingState,
	useReactTable,
} from "@tanstack/react-table";
import {
	ArrowUpDown,
	ChevronLeft,
	ChevronRight,
	Download,
	Eye,
	Filter,
	Globe,
	Monitor,
	Search,
	Smartphone,
	Tablet,
} from "lucide-react";
import { useState } from "react";
import { api } from "@/api/client";
import { Layout } from "@/components/layout/Layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { auth } from "@/lib/auth";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import type { Visitor } from "@/types/visitor";

export const Route = createFileRoute("/visitors")({
	beforeLoad: () => {
		if (!auth.isAuthenticated()) {
			throw redirect({ to: "/login" });
		}
	},
	component: VisitorsPage,
});

const columnHelper = createColumnHelper<Visitor>();

const getDeviceIcon = (device?: string) => {
	if (!device) return Monitor;
	const d = device.toLowerCase();
	if (d.includes("mobile") || d.includes("phone")) return Smartphone;
	if (d.includes("tablet")) return Tablet;
	return Monitor;
};

const columns = [
	columnHelper.accessor("ip", {
		header: ({ column }) => (
			<Button
				variant="ghost"
				onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
				className="h-8 px-2 hover:bg-transparent"
			>
				IP 地址
				<ArrowUpDown className="ml-2 h-4 w-4" />
			</Button>
		),
		cell: (info) => (
			<span className="font-mono text-sm font-medium">{info.getValue()}</span>
		),
	}),
	columnHelper.accessor("path", {
		header: "访问路径",
		cell: (info) => (
			<div className="max-w-[200px] truncate">
				<span className="text-sm">{info.getValue() || "/"}</span>
			</div>
		),
	}),
	columnHelper.accessor("browser", {
		header: "浏览器",
		cell: (info) => {
			const browser = info.getValue() || "Unknown";
			return (
				<Badge variant="secondary" className="text-xs">
					{browser}
				</Badge>
			);
		},
	}),
	columnHelper.accessor("device", {
		header: "设备",
		cell: (info) => {
			const device = info.getValue() || "Unknown";
			const DeviceIcon = getDeviceIcon(device);
			return (
				<div className="flex items-center gap-2">
					<DeviceIcon className="h-4 w-4 text-muted-foreground" />
					<span className="text-sm">{device}</span>
				</div>
			);
		},
	}),
	columnHelper.accessor("os", {
		header: "操作系统",
		cell: (info) => (
			<Badge variant="outline" className="text-xs">
				{info.getValue() || "Unknown"}
			</Badge>
		),
	}),
	columnHelper.accessor("visitedAt", {
		header: ({ column }) => (
			<Button
				variant="ghost"
				onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
				className="h-8 px-2 hover:bg-transparent"
			>
				访问时间
				<ArrowUpDown className="ml-2 h-4 w-4" />
			</Button>
		),
		cell: (info) => (
			<div className="flex flex-col">
				<span className="text-sm font-medium">
					{formatDate(info.getValue())}
				</span>
				<span className="text-xs text-muted-foreground">
					{formatRelativeTime(info.getValue())}
				</span>
			</div>
		),
	}),
];

function VisitorsPage() {
	const [sorting, setSorting] = useState<SortingState>([
		{
			id: "visitedAt",
			desc: true,
		},
	]);
	const [page, setPage] = useState(1);
	const [searchIP, setSearchIP] = useState("");
	const [searchPath, setSearchPath] = useState("");
	const [filterBrowser, setFilterBrowser] = useState<string>("all");
	const [filterDevice, setFilterDevice] = useState<string>("all");
	const [selectedVisitor, setSelectedVisitor] = useState<Visitor | null>(null);

	// 创建带有事件处理器的列定义
	const columnsWithActions = [
		...columns,
		columnHelper.display({
			id: "actions",
			header: "操作",
			cell: (info) => (
				<Button
					variant="ghost"
					size="sm"
					onClick={(e) => {
						e.stopPropagation();
						setSelectedVisitor(info.row.original);
					}}
					className="h-8"
				>
					<Eye className="h-4 w-4" />
				</Button>
			),
		}),
	];

	const pageSize = 20;

	const { data, isLoading, error } = useQuery({
		queryKey: ["visitors", page, searchIP, searchPath],
		queryFn: async () => {
			const result = await api.getVisitors({
				page,
				pageSize,
				ip: searchIP || undefined,
				path: searchPath || undefined,
			});
			if (result.success && result.data) {
				return result.data;
			}
			throw new Error(result.error || "获取访客列表失败");
		},
	});

	const visitors = data?.visitors || [];
	const total = data?.total || 0;
	const totalPages = Math.ceil(total / pageSize);

	// 客户端筛选
	let filteredVisitors = visitors;
	if (filterBrowser !== "all") {
		filteredVisitors = filteredVisitors.filter(
			(v) => v.browser?.toLowerCase() === filterBrowser.toLowerCase(),
		);
	}
	if (filterDevice !== "all") {
		filteredVisitors = filteredVisitors.filter((v) => {
			if (filterDevice === "mobile") {
				return (
					v.device?.toLowerCase().includes("mobile") ||
					v.device?.toLowerCase().includes("phone")
				);
			}
			if (filterDevice === "tablet") {
				return v.device?.toLowerCase().includes("tablet");
			}
			if (filterDevice === "desktop") {
				return (
					!v.device?.toLowerCase().includes("mobile") &&
					!v.device?.toLowerCase().includes("tablet") &&
					!v.device?.toLowerCase().includes("phone")
				);
			}
			return true;
		});
	}

	const table = useReactTable({
		data: filteredVisitors,
		columns: columnsWithActions,
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getSortedRowModel: getSortedRowModel(),
		onSortingChange: setSorting,
		state: {
			sorting,
		},
		manualPagination: true,
		pageCount: totalPages,
	});

	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault();
		setPage(1);
	};

	const handleExport = () => {
		const csv = [
			["IP地址", "访问路径", "浏览器", "设备", "操作系统", "访问时间"].join(
				",",
			),
			...visitors.map((v) =>
				[
					v.ip,
					v.path || "/",
					v.browser || "Unknown",
					v.device || "Unknown",
					v.os || "Unknown",
					formatDate(v.visitedAt),
				].join(","),
			),
		].join("\n");

		const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
		const link = document.createElement("a");
		const url = URL.createObjectURL(blob);
		link.setAttribute("href", url);
		link.setAttribute(
			"download",
			`visitors_${new Date().toISOString().split("T")[0]}.csv`,
		);
		link.style.visibility = "hidden";
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	};

	const browsers = Array.from(
		new Set(visitors.map((v) => v.browser).filter(Boolean)),
	);
	const devices = Array.from(
		new Set(visitors.map((v) => v.device).filter(Boolean)),
	);

	return (
		<Layout>
			<div className="space-y-6 p-6 md:p-8">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">
							访客列表
						</h1>
						<p className="text-muted-foreground mt-2 text-lg">
							查看和管理所有访客记录
						</p>
					</div>
					{visitors.length > 0 && (
						<Button onClick={handleExport} className="gap-2">
							<Download className="h-4 w-4" />
							导出数据
						</Button>
					)}
				</div>

				<Card className="border-0 shadow-lg">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Filter className="h-5 w-5" />
							筛选和搜索
						</CardTitle>
					</CardHeader>
					<CardContent>
						<form onSubmit={handleSearch} className="space-y-4">
							<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
								<div className="relative">
									<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
									<Input
										placeholder="搜索 IP 地址..."
										value={searchIP}
										onChange={(e) => setSearchIP(e.target.value)}
										className="pl-9"
									/>
								</div>
								<Input
									placeholder="搜索访问路径..."
									value={searchPath}
									onChange={(e) => setSearchPath(e.target.value)}
								/>
								<Select value={filterBrowser} onValueChange={setFilterBrowser}>
									<SelectTrigger>
										<SelectValue placeholder="选择浏览器" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">所有浏览器</SelectItem>
										{browsers.map((browser) => (
											<SelectItem key={browser} value={browser || ""}>
												{browser}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<Select value={filterDevice} onValueChange={setFilterDevice}>
									<SelectTrigger>
										<SelectValue placeholder="选择设备类型" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">所有设备</SelectItem>
										<SelectItem value="desktop">桌面</SelectItem>
										<SelectItem value="tablet">平板</SelectItem>
										<SelectItem value="mobile">手机</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div className="flex gap-2">
								<Button type="submit" className="gap-2">
									<Search className="h-4 w-4" />
									搜索
								</Button>
								<Button
									type="button"
									variant="outline"
									onClick={() => {
										setSearchIP("");
										setSearchPath("");
										setFilterBrowser("all");
										setFilterDevice("all");
										setPage(1);
									}}
								>
									重置
								</Button>
							</div>
						</form>
					</CardContent>
				</Card>

				<Card className="border-0 shadow-lg">
					<CardHeader>
						<div className="flex items-center justify-between">
							<CardTitle>访客记录</CardTitle>
							<Badge variant="secondary">共 {total} 条记录</Badge>
						</div>
					</CardHeader>
					<CardContent>
						{isLoading ? (
							<div className="flex items-center justify-center py-12">
								<div className="flex flex-col items-center gap-3">
									<div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
									<div className="text-muted-foreground">加载中...</div>
								</div>
							</div>
						) : error ? (
							<div className="flex items-center justify-center py-12 text-destructive">
								<div className="text-center">
									<div className="text-lg font-semibold mb-2">加载失败</div>
									<div className="text-sm">
										{error instanceof Error ? error.message : "未知错误"}
									</div>
								</div>
							</div>
						) : filteredVisitors.length === 0 ? (
							<div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
								<Globe className="h-12 w-12 mb-4 opacity-50" />
								<div className="text-lg font-semibold mb-2">暂无访客记录</div>
								<div className="text-sm">请尝试调整筛选条件</div>
							</div>
						) : (
							<>
								<div className="rounded-lg border overflow-hidden">
									<div className="overflow-x-auto">
										<table className="w-full">
											<thead>
												{table.getHeaderGroups().map((headerGroup) => (
													<tr
														key={headerGroup.id}
														className="border-b bg-muted/50"
													>
														{headerGroup.headers.map((header) => (
															<th
																key={header.id}
																className="h-12 px-4 text-left align-middle font-semibold text-muted-foreground"
															>
																{header.isPlaceholder
																	? null
																	: flexRender(
																			header.column.columnDef.header,
																			header.getContext(),
																		)}
															</th>
														))}
													</tr>
												))}
											</thead>
											<tbody>
												{table.getRowModel().rows.map((row) => (
													<tr
														key={row.id}
														className="border-b transition-colors hover:bg-muted/50 cursor-pointer"
														onClick={() => setSelectedVisitor(row.original)}
													>
														{row.getVisibleCells().map((cell) => (
															<td key={cell.id} className="p-4 align-middle">
																{flexRender(
																	cell.column.columnDef.cell,
																	cell.getContext(),
																)}
															</td>
														))}
													</tr>
												))}
											</tbody>
										</table>
									</div>
								</div>

								<div className="flex items-center justify-between px-2 py-4">
									<div className="text-sm text-muted-foreground">
										显示 {(page - 1) * pageSize + 1} -{" "}
										{Math.min(page * pageSize, total)} 条，共 {total} 条记录
									</div>
									<div className="flex gap-2">
										<Button
											variant="outline"
											size="sm"
											onClick={() => setPage((p) => Math.max(1, p - 1))}
											disabled={page === 1}
											className="gap-1"
										>
											<ChevronLeft className="h-4 w-4" />
											上一页
										</Button>
										<div className="flex items-center gap-1 px-3 text-sm">
											第 {page} / {totalPages} 页
										</div>
										<Button
											variant="outline"
											size="sm"
											onClick={() =>
												setPage((p) => Math.min(totalPages, p + 1))
											}
											disabled={page >= totalPages}
											className="gap-1"
										>
											下一页
											<ChevronRight className="h-4 w-4" />
										</Button>
									</div>
								</div>
							</>
						)}
					</CardContent>
				</Card>
			</div>

			{/* 访客详情对话框 */}
			<Dialog
				open={!!selectedVisitor}
				onOpenChange={(open) => !open && setSelectedVisitor(null)}
			>
				<DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>访客详情</DialogTitle>
						<DialogDescription>查看访客的详细信息</DialogDescription>
					</DialogHeader>
					{selectedVisitor && (
						<div className="space-y-4">
							<div className="grid gap-4 md:grid-cols-2">
								<div>
									<label className="text-sm font-medium text-muted-foreground">
										IP 地址
									</label>
									<div className="mt-1 font-mono text-sm">
										{selectedVisitor.ip}
									</div>
								</div>
								<div>
									<label className="text-sm font-medium text-muted-foreground">
										访问路径
									</label>
									<div className="mt-1 text-sm">
										{selectedVisitor.path || "/"}
									</div>
								</div>
								<div>
									<label className="text-sm font-medium text-muted-foreground">
										浏览器
									</label>
									<div className="mt-1">
										<Badge variant="secondary">
											{selectedVisitor.browser || "Unknown"}
										</Badge>
									</div>
								</div>
								<div>
									<label className="text-sm font-medium text-muted-foreground">
										设备
									</label>
									<div className="mt-1 flex items-center gap-2">
										{(() => {
											const DeviceIcon = getDeviceIcon(selectedVisitor.device);
											return (
												<>
													<DeviceIcon className="h-4 w-4 text-muted-foreground" />
													<span className="text-sm">
														{selectedVisitor.device || "Unknown"}
													</span>
												</>
											);
										})()}
									</div>
								</div>
								<div>
									<label className="text-sm font-medium text-muted-foreground">
										操作系统
									</label>
									<div className="mt-1">
										<Badge variant="outline">
											{selectedVisitor.os || "Unknown"}
										</Badge>
									</div>
								</div>
								<div>
									<label className="text-sm font-medium text-muted-foreground">
										访问时间
									</label>
									<div className="mt-1 text-sm">
										<div>{formatDate(selectedVisitor.visitedAt)}</div>
										<div className="text-xs text-muted-foreground">
											{formatRelativeTime(selectedVisitor.visitedAt)}
										</div>
									</div>
								</div>
								{selectedVisitor.country && (
									<div>
										<label className="text-sm font-medium text-muted-foreground">
											国家/地区
										</label>
										<div className="mt-1 text-sm">
											{selectedVisitor.country}
										</div>
									</div>
								)}
								{selectedVisitor.city && (
									<div>
										<label className="text-sm font-medium text-muted-foreground">
											城市
										</label>
										<div className="mt-1 text-sm">{selectedVisitor.city}</div>
									</div>
								)}
							</div>
							{selectedVisitor.referer && (
								<div>
									<label className="text-sm font-medium text-muted-foreground">
										来源页面
									</label>
									<div className="mt-1 text-sm break-all">
										{selectedVisitor.referer}
									</div>
								</div>
							)}
							{selectedVisitor.userAgent && (
								<div>
									<label className="text-sm font-medium text-muted-foreground">
										User Agent
									</label>
									<div className="mt-1 text-xs font-mono break-all bg-muted p-2 rounded">
										{selectedVisitor.userAgent}
									</div>
								</div>
							)}
						</div>
					)}
				</DialogContent>
			</Dialog>
		</Layout>
	);
}
