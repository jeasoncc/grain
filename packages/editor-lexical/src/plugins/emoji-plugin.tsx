/**
 * Emoji 短代码转换插件
 * 
 * 功能：短代码自动转换，如 :smile: → 😀
 * 
 * TODO: Emoji 选择器需要解决 @emoji-mart/react 的 React 版本冲突问题
 */

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { TextNode } from "lexical";
import { useEffect } from "react";

/**
 * 常用 emoji 短代码映射表
 */
const EMOJI_SHORTCODES: Record<string, string> = {
  // 表情符号快捷方式
  ":)": "😊",
  ":-)": "😊",
  ":(": "😞",
  ":-(": "😞",
  ":D": "😃",
  ":-D": "😃",
  ";)": "😉",
  ";-)": "😉",
  ":P": "😛",
  ":-P": "😛",
  ":O": "😮",
  ":-O": "😮",
  "<3": "❤️",
  "</3": "💔",
  
  // 标准短代码
  ":+1:": "👍",
  ":-1:": "👎",
  ":thumbsup:": "👍",
  ":thumbsdown:": "👎",
  ":smile:": "😀",
  ":grin:": "😁",
  ":joy:": "😂",
  ":rofl:": "🤣",
  ":smiley:": "😃",
  ":wink:": "😉",
  ":blush:": "😊",
  ":innocent:": "😇",
  ":heart_eyes:": "😍",
  ":kissing_heart:": "😘",
  ":thinking:": "🤔",
  ":neutral:": "😐",
  ":expressionless:": "😑",
  ":unamused:": "😒",
  ":sweat:": "😓",
  ":pensive:": "😔",
  ":confused:": "😕",
  ":disappointed:": "😞",
  ":worried:": "😟",
  ":angry:": "😠",
  ":rage:": "😡",
  ":cry:": "😢",
  ":sob:": "😭",
  ":fearful:": "😨",
  ":scream:": "😱",
  ":sleeping:": "😴",
  ":sunglasses:": "😎",
  ":nerd:": "🤓",
  ":clown:": "🤡",
  ":fire:": "🔥",
  ":100:": "💯",
  ":star:": "⭐",
  ":sparkles:": "✨",
  ":zap:": "⚡",
  ":boom:": "💥",
  ":heart:": "❤️",
  ":orange_heart:": "🧡",
  ":yellow_heart:": "💛",
  ":green_heart:": "💚",
  ":blue_heart:": "💙",
  ":purple_heart:": "💜",
  ":check:": "✅",
  ":x:": "❌",
  ":warning:": "⚠️",
  ":question:": "❓",
  ":exclamation:": "❗",
  ":bulb:": "💡",
  ":memo:": "📝",
  ":book:": "📖",
  ":rocket:": "🚀",
  ":tada:": "🎉",
  ":gift:": "🎁",
  ":trophy:": "🏆",
  ":medal:": "🏅",
  ":clap:": "👏",
  ":wave:": "👋",
  ":ok:": "👌",
  ":pray:": "🙏",
  ":muscle:": "💪",
  ":eyes:": "👀",
  ":coffee:": "☕",
  ":pizza:": "🍕",
  ":beer:": "🍺",
  ":cake:": "🎂",
  ":laugh:": "😆",
  ":lol:": "😂",
  ":haha:": "😄",
  ":cool:": "😎",
  ":love:": "😍",
  ":kiss:": "😘",
  ":sad:": "😢",
  ":happy:": "😊",
  ":party:": "🎉",
  ":thumbup:": "👍",
  ":up:": "👍",
  ":down:": "👎",
  ":yes:": "✅",
  ":no:": "❌",
  ":idea:": "💡",
  ":note:": "📝",
  ":pin:": "📌",
  ":link:": "🔗",
  ":lock:": "🔒",
  ":unlock:": "🔓",
  ":key:": "🔑",
  ":search:": "🔍",
  ":settings:": "⚙️",
  ":tool:": "🔧",
  ":bug:": "🐛",
  ":fix:": "🔧",
  ":new:": "🆕",
  ":hot:": "🔥",
  ":cold:": "🥶",
  ":sun:": "☀️",
  ":moon:": "🌙",
  ":cloud:": "☁️",
  ":rain:": "🌧️",
  ":snow:": "❄️",
};

export default function EmojiPlugin(): null {
  const [editor] = useLexicalComposerContext();

  // 短代码转换
  useEffect(() => {
    const removeTransform = editor.registerNodeTransform(TextNode, (node) => {
      const text = node.getTextContent();
      
      // 查找所有匹配的短代码
      let newText = text;
      let hasMatch = false;
      let lengthDiff = 0;
      
      for (const [shortcode, emoji] of Object.entries(EMOJI_SHORTCODES)) {
        if (newText.includes(shortcode)) {
          const count = newText.split(shortcode).length - 1;
          lengthDiff += count * (shortcode.length - emoji.length);
          newText = newText.split(shortcode).join(emoji);
          hasMatch = true;
        }
      }
      
      if (hasMatch && newText !== text) {
        // 更新文本内容
        node.setTextContent(newText);
        
        // 将光标移到文本末尾
        const newLength = newText.length;
        node.select(newLength, newLength);
      }
    });

    return removeTransform;
  }, [editor]);

  return null;
}
