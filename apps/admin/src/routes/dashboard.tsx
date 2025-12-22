import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import {
	Activity,
	Calendar,
	Globe,
	TrendingUp,
	Users,
	Zap,
} from "lucide-react";
import { api } from "@/api/client";
import { Layout } from "@/components/layout/Layout";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { auth } from "@/lib/auth";

export const Route = createFileRoute("/dashboard")({
	beforeLoad: () => {
		if (!auth.isAuthenticated()) {
			throw redirect({ to: "/login" });
		}
	},
	component: DashboardPage,
});

function DashboardPage() {
	const { data: statsData, isLoading } = useQuery({
		queryKey: ["stats"],
		queryFn: async () => {
			const result = await api.getStats();
			if (result.success && result.data) {
				return result.data;
			}
			throw new Error(result.error || "获取统计信息失败");
		},
		refetchInterval: 30000,
	});

	const stats = statsData || {
		total: 0,
		today: 0,
		thisWeek: 0,
		thisMonth: 0,
		uniqueIPs: 0,
	};

	const statCards = [
		{
			title: "总访客数",
			value: stats.total.toLocaleString(),
			description: "累计访客总数",
			icon: Users,
			gradient: "from-blue-500 to-blue-600",
			bgGradient:
				"from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20",
			iconBg: "bg-blue-500",
			trend: stats.today > 0 ? "up" : "neutral",
		},
		{
			title: "今日访客",
			value: stats.today.toLocaleString(),
			description: "今天的访客数量",
			icon: Zap,
			gradient: "from-green-500 to-emerald-600",
			bgGradient:
				"from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-800/20",
			iconBg: "bg-green-500",
			trend: "up",
		},
		{
			title: "本周访客",
			value: stats.thisWeek.toLocaleString(),
			description: "最近7天的访客",
			icon: Calendar,
			gradient: "from-purple-500 to-purple-600",
			bgGradient:
				"from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20",
			iconBg: "bg-purple-500",
			trend: "up",
		},
		{
			title: "本月访客",
			value: stats.thisMonth.toLocaleString(),
			description: "最近30天的访客",
			icon: TrendingUp,
			gradient: "from-orange-500 to-orange-600",
			bgGradient:
				"from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20",
			iconBg: "bg-orange-500",
			trend: "up",
		},
		{
			title: "独立IP",
			value: stats.uniqueIPs.toLocaleString(),
			description: "独立IP地址数量",
			icon: Globe,
			gradient: "from-indigo-500 to-indigo-600",
			bgGradient:
				"from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20",
			iconBg: "bg-indigo-500",
			trend: "neutral",
		},
	];

	const growthRate =
		stats.total > 0 ? ((stats.today / stats.total) * 100).toFixed(1) : "0";

	return (
		<Layout>
			<div className="space-y-8 p-6 md:p-8">
				{/* 页面标题 */}
				<div className="space-y-2">
					<div className="flex items-center justify-between">
						<div>
							<h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">
								仪表板
							</h1>
							<p className="text-muted-foreground mt-2 text-lg">
								实时查看访客统计信息和系统概览
							</p>
						</div>
						{stats.today > 0 && (
							<Badge variant="secondary" className="text-sm px-4 py-2">
								<TrendingUp className="h-4 w-4 mr-2" />
								今日增长 {growthRate}%
							</Badge>
						)}
					</div>
				</div>

				{/* 统计卡片网格 */}
				{isLoading ? (
					<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
						{[1, 2, 3, 4, 5].map((i) => (
							<Card key={i} className="animate-pulse">
								<CardHeader>
									<div className="h-5 w-32 bg-muted rounded" />
								</CardHeader>
								<CardContent>
									<div className="h-10 w-24 bg-muted rounded mb-2" />
									<div className="h-4 w-40 bg-muted rounded" />
								</CardContent>
							</Card>
						))}
					</div>
				) : (
					<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
						{statCards.map((stat) => {
							const Icon = stat.icon;
							return (
								<Card
									key={stat.title}
									className="group relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
								>
									<div
										className={`absolute inset-0 bg-gradient-to-br ${stat.bgGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
									/>
									<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 relative z-10">
										<CardTitle className="text-sm font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
											{stat.title}
										</CardTitle>
										<div
											className={`rounded-xl p-3 ${stat.iconBg} shadow-lg group-hover:scale-110 transition-transform duration-300`}
										>
											<Icon className="h-5 w-5 text-white" />
										</div>
									</CardHeader>
									<CardContent className="relative z-10">
										<div className="flex items-baseline gap-2 mb-2">
											<div
												className={`text-3xl font-bold bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent`}
											>
												{stat.value}
											</div>
											{stat.trend === "up" && (
												<Badge variant="secondary" className="text-xs">
													<TrendingUp className="h-3 w-3 mr-1" />
													活跃
												</Badge>
											)}
										</div>
										<p className="text-xs text-muted-foreground">
											{stat.description}
										</p>
									</CardContent>
								</Card>
							);
						})}
					</div>
				)}

				{/* 快速统计概览 */}
				{!isLoading && (
					<div className="grid gap-6 md:grid-cols-2">
						<Card className="border-0 shadow-lg">
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Activity className="h-5 w-5 text-blue-500" />
									系统概览
								</CardTitle>
								<CardDescription>实时访客数据统计</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="flex items-center justify-between">
									<span className="text-sm text-muted-foreground">
										今日活跃度
									</span>
									<div className="flex items-center gap-2">
										<div className="h-2 w-24 bg-muted rounded-full overflow-hidden">
											<div
												className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500"
												style={{
													width: `${Math.min((stats.today / Math.max(stats.thisWeek, 1)) * 100, 100)}%`,
												}}
											/>
										</div>
										<span className="text-sm font-medium">
											{stats.thisWeek > 0
												? Math.round((stats.today / stats.thisWeek) * 100)
												: 0}
											%
										</span>
									</div>
								</div>
								<div className="flex items-center justify-between">
									<span className="text-sm text-muted-foreground">
										本周占比
									</span>
									<span className="text-sm font-medium">
										{stats.total > 0
											? ((stats.thisWeek / stats.total) * 100).toFixed(1)
											: 0}
										%
									</span>
								</div>
								<div className="flex items-center justify-between">
									<span className="text-sm text-muted-foreground">
										本月占比
									</span>
									<span className="text-sm font-medium">
										{stats.total > 0
											? ((stats.thisMonth / stats.total) * 100).toFixed(1)
											: 0}
										%
									</span>
								</div>
							</CardContent>
						</Card>

						<Card className="border-0 shadow-lg">
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Globe className="h-5 w-5 text-indigo-500" />
									访问分析
								</CardTitle>
								<CardDescription>访客来源和分布</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="flex items-center justify-between">
									<span className="text-sm text-muted-foreground">
										独立IP占比
									</span>
									<span className="text-sm font-medium">
										{stats.total > 0
											? ((stats.uniqueIPs / stats.total) * 100).toFixed(1)
											: 0}
										%
									</span>
								</div>
								<div className="flex items-center justify-between">
									<span className="text-sm text-muted-foreground">
										平均访问/日
									</span>
									<span className="text-sm font-medium">
										{stats.thisWeek > 0 ? (stats.thisWeek / 7).toFixed(1) : 0}
									</span>
								</div>
								<div className="flex items-center justify-between">
									<span className="text-sm text-muted-foreground">
										今日独立IP
									</span>
									<Badge variant="secondary">{stats.uniqueIPs}</Badge>
								</div>
							</CardContent>
						</Card>
					</div>
				)}
			</div>
		</Layout>
	);
}
