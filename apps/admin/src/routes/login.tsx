import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { LogIn, Sparkles } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { auth } from "@/lib/auth";

export const Route = createFileRoute("/login")({
	beforeLoad: () => {
		if (auth.isAuthenticated()) {
			throw redirect({ to: "/dashboard" });
		}
	},
	component: LoginPage,
});

function LoginPage() {
	const navigate = useNavigate();
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		setLoading(true);

		try {
			const result = await auth.login(username, password);
			if (result.success) {
				navigate({ to: "/dashboard" });
			} else {
				setError(result.error || "登录失败");
			}
		} catch (err) {
			setError("登录时发生错误");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
			<div className="absolute inset-0 bg-grid-pattern opacity-5 dark:opacity-10" />
			<Card className="w-full max-w-md relative z-10 shadow-2xl border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
				<CardHeader className="space-y-4 text-center pb-8">
					<div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg mb-2">
						<Sparkles className="h-8 w-8 text-white" />
					</div>
					<CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
						访客管理系统
					</CardTitle>
					<CardDescription className="text-base">
						欢迎回来，请登录您的账户
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit} className="space-y-6">
						<div className="space-y-2">
							<Label htmlFor="username" className="text-sm font-medium">
								用户名
							</Label>
							<Input
								id="username"
								type="text"
								placeholder="请输入用户名"
								value={username}
								onChange={(e) => setUsername(e.target.value)}
								required
								autoFocus
								className="h-11 transition-all focus:ring-2 focus:ring-blue-500"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="password" className="text-sm font-medium">
								密码
							</Label>
							<Input
								id="password"
								type="password"
								placeholder="请输入密码"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								required
								className="h-11 transition-all focus:ring-2 focus:ring-blue-500"
							/>
						</div>
						{error && (
							<div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 p-3 rounded-lg animate-in fade-in slide-in-from-top-2">
								{error}
							</div>
						)}
						<Button
							type="submit"
							className="w-full h-11 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg transition-all hover:shadow-xl disabled:opacity-50"
							disabled={loading}
						>
							{loading ? (
								<span className="flex items-center gap-2">
									<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
									登录中...
								</span>
							) : (
								<span className="flex items-center gap-2">
									<LogIn className="h-4 w-4" />
									登录
								</span>
							)}
						</Button>
						<div className="text-xs text-muted-foreground text-center pt-4 border-t">
							<p className="mb-1">测试账号信息</p>
							<p className="font-mono">用户名: admin</p>
							<p className="font-mono">密码: admin123</p>
						</div>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
