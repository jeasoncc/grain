/**
 * Diary Domain
 *
 * Provides diary creation and management functionality.
 */

// Service
export {
	createDiaryInFileTree,
	DIARY_ROOT_FOLDER,
	type DiaryCreationResult,
	type DiaryMetadata,
} from "./diary.service";
// Utils (pure functions)
export {
	type DiaryFolderStructure,
	generateDiaryContent,
	getChineseEra,
	getChineseHour,
	getDiaryFolderStructure,
	getZodiacAnimal,
} from "./diary.utils";
