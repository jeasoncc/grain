/**
 * React 19 类型兼容性补丁
 * 
 * 解决 React 19 与某些库（如 Radix UI）的类型不兼容问题
 * 这是一个临时解决方案，等待库更新后可以移除
 */

declare module 'react' {
  // 统一 VoidOrUndefinedOnly 类型定义
  // 避免 "Two different types with this name exist" 错误
  interface DO_NOT_USE_OR_YOU_WILL_BE_FIRED_EXPERIMENTAL_REACT_NODES {}
}

export {}
