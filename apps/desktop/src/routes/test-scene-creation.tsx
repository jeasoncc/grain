import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { SceneCreationDebug } from "@/components/debug/scene-creation-debug";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DevOnlyPage } from "@/components/dev-only";
import { useSceneCreation } from "@/hooks/use-scene-creation";
import { useChaptersByProject } from "@/services/chapters";
import { useAllProjects } from "@/services/projects";
import { useScenesByProject } from "@/services/scenes";
import { useSceneCreationStore } from "@/stores/scene-creation";

export const Route = createFileRoute("/test-scene-creation")({
	component: () => (
		<DevOnlyPage>
			<TestSceneCreation />
		</DevOnlyPage>
	),
});

function TestSceneCreation() {
	const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
		null,
	);
	const [selectedChapterId, setSelectedChapterId] = useState<string | null>(
		null,
	);

	const projects = useAllProjects();
	const chapters = useChaptersByProject(selectedProjectId);
	const scenes = useScenesByProject(selectedProjectId);
	const sceneCreationStore = useSceneCreationStore();

	// Set default project and chapter
	useEffect(() => {
		if (!selectedProjectId && projects.length > 0) {
			setSelectedProjectId(projects[0].id);
		}
	}, [projects, selectedProjectId]);

	useEffect(() => {
		if (selectedProjectId && !selectedChapterId && chapters.length > 0) {
			setSelectedChapterId(chapters[0].id);
		}
	}, [selectedProjectId, selectedChapterId, chapters]);

	const { createTextScene, createCanvasScene } = useSceneCreation({
		selectedProjectId,
		scenesOfProject: scenes,
		onSceneCreated: (sceneId, chapterId) => {
			toast.success(`Scene created: ${sceneId}`);
		},
		onError: (error, chapterId) => {
			toast.error(`Error: ${error}`);
		},
	});

	// Get reactive creation states
	const creationStates = useSceneCreationStore((state) => state.creationStates);
	const { resetCreationState } = useSceneCreationStore();

	const handleCreateTextScene = async () => {
		if (!selectedChapterId) {
			toast.error("No chapter selected");
			return;
		}
		console.log(`[Test] Creating text scene for chapter:`, selectedChapterId);
		await createTextScene(selectedChapterId);
	};

	const handleCreateCanvasScene = async () => {
		if (!selectedChapterId) {
			toast.error("No chapter selected");
			return;
		}
		console.log(`[Test] Creating canvas scene for chapter:`, selectedChapterId);
		await createCanvasScene(selectedChapterId);
	};

	const handleReset = () => {
		if (selectedChapterId) {
			resetCreationState(selectedChapterId);
			toast.info("Creation state reset");
		}
	};

	const creationState = selectedChapterId
		? creationStates[selectedChapterId]
		: null;
	const canCreate = selectedChapterId
		? !creationStates[selectedChapterId]?.isCreating
		: false;

	// Debug logging
	console.log(
		"Debug - canCreate:",
		canCreate,
		"chapterId:",
		selectedChapterId,
		"creationState:",
		creationState,
	);

	return (
		<div className="container mx-auto p-6 space-y-6">
			<h1 className="text-2xl font-bold">Scene Creation Test</h1>

			<Card>
				<CardHeader>
					<CardTitle>Project & Chapter Selection</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div>
						<label className="block text-sm font-medium mb-2">Project:</label>
						<select
							value={selectedProjectId || ""}
							onChange={(e) => setSelectedProjectId(e.target.value || null)}
							className="w-full p-2 border rounded"
						>
							<option value="">Select a project</option>
							{projects.map((project) => (
								<option key={project.id} value={project.id}>
									{project.title}
								</option>
							))}
						</select>
					</div>

					<div>
						<label className="block text-sm font-medium mb-2">Chapter:</label>
						<select
							value={selectedChapterId || ""}
							onChange={(e) => setSelectedChapterId(e.target.value || null)}
							className="w-full p-2 border rounded"
							disabled={!selectedProjectId}
						>
							<option value="">Select a chapter</option>
							{chapters.map((chapter) => (
								<option key={chapter.id} value={chapter.id}>
									{chapter.title}
								</option>
							))}
						</select>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Scene Creation Controls</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex gap-4">
						<Button
							onClick={handleCreateTextScene}
							disabled={!canCreate}
							variant="default"
						>
							{canCreate ? "Create Text Scene" : "Creating..."}
						</Button>

						<Button
							onClick={handleCreateCanvasScene}
							disabled={!canCreate}
							variant="secondary"
						>
							{canCreate ? "Create Canvas Scene" : "Creating..."}
						</Button>

						<Button onClick={handleReset} variant="outline">
							Reset State
						</Button>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Creation State</CardTitle>
				</CardHeader>
				<CardContent>
					{selectedChapterId ? (
						<SceneCreationDebug chapterId={selectedChapterId} />
					) : (
						<p>No chapter selected</p>
					)}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Current Scenes</CardTitle>
				</CardHeader>
				<CardContent>
					{selectedChapterId ? (
						<div className="space-y-2">
							{scenes
								.filter((scene) => scene.chapter === selectedChapterId)
								.sort((a, b) => a.order - b.order)
								.map((scene) => (
									<div key={scene.id} className="p-2 border rounded">
										<p>
											<strong>{scene.title}</strong> ({scene.type || "text"})
										</p>
										<p className="text-sm text-gray-600">
											Order: {scene.order}, ID: {scene.id}
										</p>
									</div>
								))}
							{scenes.filter((scene) => scene.chapter === selectedChapterId)
								.length === 0 && (
								<p className="text-gray-500">No scenes in this chapter</p>
							)}
						</div>
					) : (
						<p>Select a chapter to view scenes</p>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
