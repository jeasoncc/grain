import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { auth } from "@/lib/auth";

export function useRequireAuth() {
	const navigate = useNavigate();

	useEffect(() => {
		if (!auth.isAuthenticated()) {
			navigate({ to: "/login" });
		}
	}, [navigate]);
}
