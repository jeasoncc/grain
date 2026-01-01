/**
 * 折叠图标配置
 * 
 * 提供多种字母/符号风格供用户选择
 * 所有字母列表统一为 8 个，以兼容八卦和 H1-H6+ 标题层级
 */

export type FoldIconStyle = 
  // 古代文字
  | 'phoenician'
  | 'old-persian'
  | 'sumerian'
  | 'linear-b'
  | 'coptic'
  | 'gothic'
  | 'runic'
  | 'egyptian'
  // 中文符号
  | 'bagua'
  | 'suzhou'
  | 'chinese-number'
  | 'chinese-number-upper'
  // 现代文字
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
  | 'korean';

export interface FoldIconOption {
  readonly id: FoldIconStyle;
  readonly name: string;
  readonly nameEn: string;
  readonly letters: readonly string[];
  readonly preview: string;
  /** 年代描述 */
  readonly era?: string;
}

/**
 * 所有可用的折叠图标风格
 */
export const FOLD_ICON_OPTIONS: readonly FoldIconOption[] = [
  // ==============================
  // 古代文字
  // ==============================
  {
    id: 'sumerian',
    name: '苏美尔楔形文字',
    nameEn: 'Sumerian Cuneiform',
    letters: ['𒀀', '𒀁', '𒀂', '𒀃', '𒀄', '𒀅', '𒀆', '𒀇'],
    preview: '𒀀 𒀁 𒀂',
    era: '公元前3400年',
  },
  {
    id: 'egyptian',
    name: '埃及象形文字',
    nameEn: 'Egyptian Hieroglyphs',
    letters: ['𓀀', '𓀁', '𓀂', '𓀃', '𓀄', '𓀅', '𓀆', '𓀇'],
    preview: '𓀀 𓀁 𓀂',
    era: '公元前3200年',
  },
  {
    id: 'linear-b',
    name: '线形文字B',
    nameEn: 'Linear B',
    letters: ['𐀀', '𐀁', '𐀂', '𐀃', '𐀄', '𐀅', '𐀆', '𐀇'],
    preview: '𐀀 𐀁 𐀂',
    era: '公元前1450年',
  },
  {
    id: 'phoenician',
    name: '腓尼基字母',
    nameEn: 'Phoenician',
    letters: ['𐤀', '𐤁', '𐤂', '𐤃', '𐤄', '𐤅', '𐤆', '𐤇'],
    preview: '𐤀 𐤁 𐤂',
    era: '公元前1050年',
  },
  {
    id: 'old-persian',
    name: '古波斯楔形文字',
    nameEn: 'Old Persian',
    letters: ['𐎠', '𐎡', '𐎢', '𐎣', '𐎤', '𐎥', '𐎦', '𐎧'],
    preview: '𐎠 𐎡 𐎢',
    era: '公元前525年',
  },
  {
    id: 'coptic',
    name: '科普特字母',
    nameEn: 'Coptic',
    letters: ['Ⲁ', 'Ⲃ', 'Ⲅ', 'Ⲇ', 'Ⲉ', 'Ⲋ', 'Ⲍ', 'Ⲏ'],
    preview: 'Ⲁ Ⲃ Ⲅ',
    era: '公元2世纪',
  },
  {
    id: 'runic',
    name: '卢恩文',
    nameEn: 'Runic',
    letters: ['ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ', 'ᚷ', 'ᚹ'],
    preview: 'ᚠ ᚢ ᚦ',
    era: '公元2世纪',
  },
  {
    id: 'gothic',
    name: '哥特字母',
    nameEn: 'Gothic',
    letters: ['𐌰', '𐌱', '𐌲', '𐌳', '𐌴', '𐌵', '𐌶', '𐌷'],
    preview: '𐌰 𐌱 𐌲',
    era: '公元4世纪',
  },
  // ==============================
  // 中文符号
  // ==============================
  {
    id: 'bagua',
    name: '八卦',
    nameEn: 'Bagua (Eight Trigrams)',
    letters: ['☰', '☱', '☲', '☳', '☴', '☵', '☶', '☷'],
    preview: '☰ ☱ ☲',
    era: '周朝',
  },
  {
    id: 'suzhou',
    name: '苏州码子',
    nameEn: 'Suzhou Numerals',
    letters: ['〇', '〡', '〢', '〣', '〤', '〥', '〦', '〧'],
    preview: '〡 〢 〣',
    era: '商周时期',
  },
  {
    id: 'chinese-number',
    name: '中文数字',
    nameEn: 'Chinese Numerals',
    letters: ['一', '二', '三', '四', '五', '六', '七', '八'],
    preview: '一 二 三',
  },
  {
    id: 'chinese-number-upper',
    name: '中文大写数字',
    nameEn: 'Chinese Upper Numerals',
    letters: ['壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌'],
    preview: '壹 贰 叁',
  },
  // ==============================
  // 现代文字
  // ==============================
  {
    id: 'arabic',
    name: '阿拉伯文',
    nameEn: 'Arabic',
    letters: ['ا', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ', 'د'],
    preview: 'ا ب ت',
  },
  {
    id: 'hebrew',
    name: '希伯来文',
    nameEn: 'Hebrew',
    letters: ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח'],
    preview: 'א ב ג',
  },
  {
    id: 'greek-lower',
    name: '希腊字母 (小写)',
    nameEn: 'Greek Lowercase',
    letters: ['α', 'β', 'γ', 'δ', 'ε', 'ζ', 'η', 'θ'],
    preview: 'α β γ',
  },
  {
    id: 'greek-upper',
    name: '希腊字母 (大写)',
    nameEn: 'Greek Uppercase',
    letters: ['Α', 'Β', 'Γ', 'Δ', 'Ε', 'Ζ', 'Η', 'Θ'],
    preview: 'Α Β Γ',
  },
  {
    id: 'devanagari-vowel',
    name: '天城文 (元音)',
    nameEn: 'Devanagari Vowels',
    letters: ['अ', 'आ', 'इ', 'ई', 'उ', 'ऊ', 'ऋ', 'ए'],
    preview: 'अ आ इ',
  },
  {
    id: 'devanagari-consonant',
    name: '天城文 (辅音)',
    nameEn: 'Devanagari Consonants',
    letters: ['क', 'ख', 'ग', 'घ', 'ङ', 'च', 'छ', 'ज'],
    preview: 'क ख ग',
  },
  {
    id: 'tamil',
    name: '泰米尔文',
    nameEn: 'Tamil',
    letters: ['அ', 'ஆ', 'இ', 'ஈ', 'உ', 'ஊ', 'எ', 'ஏ'],
    preview: 'அ ஆ இ',
  },
  {
    id: 'tibetan',
    name: '藏文',
    nameEn: 'Tibetan',
    letters: ['ཀ', 'ཁ', 'ག', 'ང', 'ཅ', 'ཆ', 'ཇ', 'ཉ'],
    preview: 'ཀ ཁ ག',
  },
  {
    id: 'hiragana',
    name: '平假名',
    nameEn: 'Hiragana',
    letters: ['あ', 'い', 'う', 'え', 'お', 'か', 'き', 'く'],
    preview: 'あ い う',
  },
  {
    id: 'katakana',
    name: '片假名',
    nameEn: 'Katakana',
    letters: ['ア', 'イ', 'ウ', 'エ', 'オ', 'カ', 'キ', 'ク'],
    preview: 'ア イ ウ',
  },
  {
    id: 'korean',
    name: '韩文',
    nameEn: 'Korean',
    letters: ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ'],
    preview: 'ㄱ ㄴ ㄷ',
  },
] as const;

/**
 * 默认折叠图标风格
 */
export const DEFAULT_FOLD_ICON_STYLE: FoldIconStyle = 'bagua';

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
