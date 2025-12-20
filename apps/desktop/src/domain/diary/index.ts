/**
 * Diary Domain
 * 
 * Provides diary creation and management functionality.
 */

// Utils (pure functions)
export {
	getZodiacAnimal,
	getChineseEra,
	getChineseHour,
	getDiaryFolderStructure,
	generateDiaryContent,
	type DiaryFolderStructure,
} from "./diary.utils";

// Service
export {
	DIARY_ROOT_FOLDER,
	createDiaryInFileTree,
	type DiaryMetadata,
	type DiaryCreationResult,
} from "./diary.service";
