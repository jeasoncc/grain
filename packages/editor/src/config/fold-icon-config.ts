/**
 * Fold Icon Configuration
 * 
 * Provides multiple letter/symbol styles for user selection
 * All letter lists are unified to 8 items to support Bagua and H1-H6+ heading levels
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
  readonly letters: readonly string[];
  readonly preview: string;
  /** Era description */
  readonly era?: string;
}

/**
 * All available fold icon styles
 */
export const FOLD_ICON_OPTIONS: readonly FoldIconOption[] = [
  // ==============================
  // Ancient Scripts
  // ==============================
  {
    id: 'sumerian',
    name: 'Sumerian Cuneiform',
    letters: ['𒀀', '𒀁', '𒀂', '𒀃', '𒀄', '𒀅', '𒀆', '𒀇'],
    preview: '𒀀 𒀁 𒀂',
    era: '3400 BCE',
  },
  {
    id: 'egyptian',
    name: 'Egyptian Hieroglyphs',
    letters: ['𓀀', '𓀁', '𓀂', '𓀃', '𓀄', '𓀅', '𓀆', '𓀇'],
    preview: '𓀀 𓀁 𓀂',
    era: '3200 BCE',
  },
  {
    id: 'linear-b',
    name: 'Linear B',
    letters: ['𐀀', '𐀁', '𐀂', '𐀃', '𐀄', '𐀅', '𐀆', '𐀇'],
    preview: '𐀀 𐀁 𐀂',
    era: '1450 BCE',
  },
  {
    id: 'phoenician',
    name: 'Phoenician',
    letters: ['𐤀', '𐤁', '𐤂', '𐤃', '𐤄', '𐤅', '𐤆', '𐤇'],
    preview: '𐤀 𐤁 𐤂',
    era: '1050 BCE',
  },
  {
    id: 'old-persian',
    name: 'Old Persian',
    letters: ['𐎠', '𐎡', '𐎢', '𐎣', '𐎤', '𐎥', '𐎦', '𐎧'],
    preview: '𐎠 𐎡 𐎢',
    era: '525 BCE',
  },
  {
    id: 'coptic',
    name: 'Coptic',
    letters: ['Ⲁ', 'Ⲃ', 'Ⲅ', 'Ⲇ', 'Ⲉ', 'Ⲋ', 'Ⲍ', 'Ⲏ'],
    preview: 'Ⲁ Ⲃ Ⲅ',
    era: '2nd century',
  },
  {
    id: 'runic',
    name: 'Runic',
    letters: ['ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ', 'ᚷ', 'ᚹ'],
    preview: 'ᚠ ᚢ ᚦ',
    era: '2nd century',
  },
  {
    id: 'gothic',
    name: 'Gothic',
    letters: ['𐌰', '𐌱', '𐌲', '𐌳', '𐌴', '𐌵', '𐌶', '𐌷'],
    preview: '𐌰 𐌱 𐌲',
    era: '4th century',
  },
  // ==============================
  // Chinese Symbols
  // ==============================
  {
    id: 'bagua',
    name: 'Bagua (Eight Trigrams)',
    letters: ['☰', '☱', '☲', '☳', '☴', '☵', '☶', '☷'],
    preview: '☰ ☱ ☲',
    era: 'Zhou Dynasty',
  },
  {
    id: 'suzhou',
    name: 'Suzhou Numerals',
    letters: ['〇', '〡', '〢', '〣', '〤', '〥', '〦', '〧'],
    preview: '〡 〢 〣',
    era: 'Shang-Zhou Era',
  },
  {
    id: 'chinese-number',
    name: 'Chinese Numerals',
    letters: ['一', '二', '三', '四', '五', '六', '七', '八'],
    preview: '一 二 三',
  },
  {
    id: 'chinese-number-upper',
    name: 'Chinese Formal Numerals',
    letters: ['壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌'],
    preview: '壹 贰 叁',
  },
  // ==============================
  // Modern Scripts
  // ==============================
  {
    id: 'arabic',
    name: 'Arabic',
    letters: ['ا', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ', 'د'],
    preview: 'ا ب ت',
  },
  {
    id: 'hebrew',
    name: 'Hebrew',
    letters: ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח'],
    preview: 'א ב ג',
  },
  {
    id: 'greek-lower',
    name: 'Greek Lowercase',
    letters: ['α', 'β', 'γ', 'δ', 'ε', 'ζ', 'η', 'θ'],
    preview: 'α β γ',
  },
  {
    id: 'greek-upper',
    name: 'Greek Uppercase',
    letters: ['Α', 'Β', 'Γ', 'Δ', 'Ε', 'Ζ', 'Η', 'Θ'],
    preview: 'Α Β Γ',
  },
  {
    id: 'devanagari-vowel',
    name: 'Devanagari Vowels',
    letters: ['अ', 'आ', 'इ', 'ई', 'उ', 'ऊ', 'ऋ', 'ए'],
    preview: 'अ आ इ',
  },
  {
    id: 'devanagari-consonant',
    name: 'Devanagari Consonants',
    letters: ['क', 'ख', 'ग', 'घ', 'ङ', 'च', 'छ', 'ज'],
    preview: 'क ख ग',
  },
  {
    id: 'tamil',
    name: 'Tamil',
    letters: ['அ', 'ஆ', 'இ', 'ஈ', 'உ', 'ஊ', 'எ', 'ஏ'],
    preview: 'அ ஆ இ',
  },
  {
    id: 'tibetan',
    name: 'Tibetan',
    letters: ['ཀ', 'ཁ', 'ག', 'ང', 'ཅ', 'ཆ', 'ཇ', 'ཉ'],
    preview: 'ཀ ཁ ག',
  },
  {
    id: 'hiragana',
    name: 'Hiragana',
    letters: ['あ', 'い', 'う', 'え', 'お', 'か', 'き', 'く'],
    preview: 'あ い う',
  },
  {
    id: 'katakana',
    name: 'Katakana',
    letters: ['ア', 'イ', 'ウ', 'エ', 'オ', 'カ', 'キ', 'ク'],
    preview: 'ア イ ウ',
  },
  {
    id: 'korean',
    name: 'Korean',
    letters: ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ'],
    preview: 'ㄱ ㄴ ㄷ',
  },
] as const;

/**
 * Default fold icon style
 */
export const DEFAULT_FOLD_ICON_STYLE: FoldIconStyle = 'bagua';

/**
 * Get letter list by style ID
 */
export function getFoldIconLetters(style: FoldIconStyle): readonly string[] {
  const option = FOLD_ICON_OPTIONS.find(o => o.id === style);
  return option?.letters ?? FOLD_ICON_OPTIONS[0].letters;
}

/**
 * Get option by style ID
 */
export function getFoldIconOption(style: FoldIconStyle): FoldIconOption | undefined {
  return FOLD_ICON_OPTIONS.find(o => o.id === style);
}
