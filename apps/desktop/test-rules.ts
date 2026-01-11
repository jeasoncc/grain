// 测试函数式编程规则

// ❌ 这些应该被检测为错误
try {
  const result = someOperation();
} catch (error) {
  console.log('error');
}

const arr = [1, 2, 3];
arr.push(4); // 应该被检测

// ❌ 禁止的库
import { debounce } from 'lodash';
import moment from 'moment';

// ❌ 禁止的全局变量
const now = new Date();

// ❌ 控制台输出
console.log('test');
console.error('error');