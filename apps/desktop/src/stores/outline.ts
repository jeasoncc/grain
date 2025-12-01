import { create } from "zustand";
import type {
	ChapterInterface,
	ProjectInterface,
	SceneInterface,
} from "@/db/schema";

interface OutlineState {
	projects: ProjectInterface[];
	chapters: ChapterInterface[];
	scenes: SceneInterface[];
	setProjects: (list: ProjectInterface[]) => void;
	setChapters: (list: ChapterInterface[]) => void;
	setScenes: (list: SceneInterface[]) => void;
}

export const useOutlineStore = create<OutlineState>((set) => ({
	projects: [],
	chapters: [],
	scenes: [],
	setProjects: (list) => set({ projects: list }),
	setChapters: (list) => set({ chapters: list }),
	setScenes: (list) => set({ scenes: list }),
}));
