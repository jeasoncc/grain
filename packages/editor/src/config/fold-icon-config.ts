/**
 * 折叠图标配置
 * 
 * 提供多种字母/符号风格供用户选择
 */

export type FoldIconStyle = 
  | 'arabic'
  | 'devanagari-vowel'
  | 'devanagari-consonant'
  | 'tamil'
  | 'tibetan'
  | 'hebrew'
  | 'greek-lower'
  | 'greek-upper'
  | 'hiragana'
  | 'katakana'
  | 'korean'
  | 'runic'
  | 'egyptian';

export interface FoldIconOption {
  readonly id: FoldIconStyle;
  readonly name: string;
  readonly nameEn: string;
  readonly letters: readonly string[];
  readonly preview: string;
}

/**
 * 所有可用的折叠图标风格
 */
export const FOLD_ICON_OPTIONS: readonly FoldIconOption[] = [
  {
    id: 'arabic',
    name: '阿拉伯文',
    nameEn: 'Arabic',
    letters: ['ا', 'ب', 'ت', 'ث', 'ج', 'ح'],
    preview: 'ا ب ت',
  },
  {
    id: 'devanagari-vowel',
    name: '天城文 (元音)',
    nameEn: 'Devanagari Vowels',
    letters: ['अ', 'आ', 'इ', 'ई', 'उ', 'ऊ'],
    preview: 'अ आ इ',
  },
  {
    id: 'devanagari-consonant',
    name: '天城文 (辅音)',
    nameEn: 'Devanagari Consonants',
    letters: ['क', 'ख', 'ग', 'घ', 'ङ', 'च'],
    preview: 'क ख ग',
  },
  {
    id: 'tamil',
    name: '泰米尔文',
    nameEn: 'Tamil',
    letters: ['அ', 'ஆ', 'இ', 'ஈ', 'உ', 'ஊ'],
    preview: 'அ ஆ இ',
  },
  {
    id: 'tibetan',
    name: '藏文',
    nameEn: 'Tibetan',
    letters: ['ཀ', 'ཁ', 'ག', 'ང', 'ཅ', 'ཆ'],
    preview: 'ཀ ཁ ག',
  },
  {
    id: 'hebrew',
    name: '希伯来文',
    nameEn: 'Hebrew',
    letters: ['א', 'ב', 'ג', 'ד', 'ה', 'ו'],
    preview: 'א ב ג',
  },
  {
    id: 'greek-lower',
    name: '希腊字母 (小写)',
    nameEn: 'Greek Lowercase',
    letters: ['α', 'β', 'γ', 'δ', 'ε', 'ζ'],
    preview: 'α β γ',
  },
  {
    id: 'greek-upper',
    name: '希腊字母 (大写)',
    nameEn: 'Greek Uppercase',
    letters: ['Α', 'Β', 'Γ', 'Δ', 'Ε', 'Ζ'],
    preview: 'Α Β Γ',
  },
  {
    id: 'hiragana',
    name: '平假名',
    nameEn: 'Hiragana',
    letters: ['あ', 'い', 'う', 'え', 'お', 'か'],
    preview: 'あ い う',
  },
  {
    id: 'katakana',
    name: '片假名',
    nameEn: 'Katakana',
    letters: ['ア', 'イ', 'ウ', 'エ', 'オ', 'カ'],
    preview: 'ア イ ウ',
  },
  {
    id: 'korean',
    name: '韩文',
    nameEn: 'Korean',
    letters: ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ'],
    preview: 'ㄱ ㄴ ㄷ',
  },
  {
    id: 'runic',
    name: '卢恩文',
    nameEn: 'Runic',
    letters: ['ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ'],
    preview: 'ᚠ ᚢ ᚦ',
  },
  {
    id: 'egyptian',
    name: '埃及象形',
    nameEn: 'Egyptian',
    letters: ['𓀀', '𓀁', '𓀂', '𓀃', '𓀄', '𓀅'],
    preview: '𓀀 𓀁 𓀂',
  },
] as const;

/**
 * 默认折叠图标风格
 */
export const DEFAULT_FOLD_ICON_STYLE: FoldIconStyle = 'arabic';

/**
 * 根据风格 ID 获取字母列表
 */
export function getFoldIconLetters(style: FoldIconStyle): readonly string[] {
  const option = FOLD_ICON_OPTIONS.find(o => o.id === style);
  return option?.letters ?? FOLD_ICON_OPTIONS[0].letters;
}

/**
 * 根据风格 ID 获取选项
 */
export function getFoldIconOption(style: FoldIconStyle): FoldIconOption | undefined {
  return FOLD_ICON_OPTIONS.find(o => o.id === style);
}
