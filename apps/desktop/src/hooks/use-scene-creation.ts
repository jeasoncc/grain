import { useCallback } from "react";
import { toast } from "sonner";
import logger from "@/log";
import { createCanvasScene, createScene } from "@/services/scenes";
import { useSceneCreationStore } from "@/stores/scene-creation";

export interface UseSceneCreationProps {
	selectedProjectId: string | null;
	scenesOfProject: Array<{ chapter: string; order: number }>;
	onSceneCreated?: (sceneId: string, chapterId: string) => void;
	onError?: (error: string, chapterId: string) => void;
}

export function useSceneCreation({
	selectedProjectId,
	scenesOfProject,
	onSceneCreated,
	onError,
}: UseSceneCreationProps) {
	// Get store actions
	const {
		setCreating,
		setLastCreatedScene,
		incrementCreationCount,
		resetCreationState,
	} = useSceneCreationStore();

	const handleCreateScene = useCallback(
		async (chapterId: string, type: "text" | "canvas" = "text") => {
			logger.debug(
				`[Scene Creation] Starting ${type} scene creation for chapter:`,
				chapterId,
			);

			if (!selectedProjectId) {
				const error = "No project selected";
				toast.error(error);
				onError?.(error, chapterId);
				return null;
			}

			// Get current state to check if creation is in progress
			const currentState = useSceneCreationStore.getState();
			const chapterState = currentState.creationStates[chapterId];
			logger.debug(`[Scene Creation] Current chapter state:`, chapterState);

			if (chapterState?.isCreating) {
				const error = `${type === "canvas" ? "Canvas scene" : "Scene"} creation already in progress`;
				logger.debug(`[Scene Creation] Blocked - already creating:`, error);
				toast.error(error);
				onError?.(error, chapterId);
				return null;
			}

			// Set creation state to prevent concurrent operations
			logger.debug(
				`[Scene Creation] Setting creating state to true for chapter:`,
				chapterId,
			);
			setCreating(chapterId, true);

			const existingScenes = scenesOfProject.filter(
				(s) => s.chapter === chapterId,
			);
			const nextOrder = existingScenes.length
				? Math.max(...existingScenes.map((s) => s.order)) + 1
				: 1;

			try {
				let newScene;

				if (type === "canvas") {
					newScene = await createCanvasScene({
						projectId: selectedProjectId,
						chapterId,
						title: `Canvas ${nextOrder}`,
						order: nextOrder,
					});
					toast.success("Canvas scene created");
				} else {
					newScene = await createScene({
						projectId: selectedProjectId,
						chapterId,
						title: `Scene ${nextOrder}`,
						order: nextOrder,
						content: "",
					});
					toast.success("Scene created");
				}

				// Update creation state
				logger.debug(
					`[Scene Creation] Scene created successfully:`,
					newScene.id,
				);
				setLastCreatedScene(chapterId, newScene.id);
				incrementCreationCount(chapterId);

				onSceneCreated?.(newScene.id, chapterId);
				return newScene;
			} catch (error) {
				const errorMessage =
					error instanceof Error
						? error.message
						: `Failed to create ${type} scene`;
				toast.error(errorMessage);
				onError?.(errorMessage, chapterId);

				// Reset creation state on error
				resetCreationState(chapterId);
				return null;
			} finally {
				// Always reset creation state
				logger.debug(
					`[Scene Creation] Resetting creating state to false for chapter:`,
					chapterId,
				);
				setCreating(chapterId, false);
			}
		},
		[
			selectedProjectId,
			scenesOfProject,
			setCreating,
			setLastCreatedScene,
			incrementCreationCount,
			resetCreationState,
			onSceneCreated,
			onError,
		],
	);

	const createTextScene = useCallback(
		(chapterId: string) => handleCreateScene(chapterId, "text"),
		[handleCreateScene],
	);

	const createCanvasSceneHandler = useCallback(
		(chapterId: string) => handleCreateScene(chapterId, "canvas"),
		[handleCreateScene],
	);

	return {
		createTextScene,
		createCanvasScene: createCanvasSceneHandler,
	};
}
