/**
 * @fileoverview Rule to prohibit Promise methods and suggest TaskEither alternatives
 * @author Grain Team
 * 
 * Requirements: 1.3, 17.2-17.5
 * - WHEN a developer uses Promise.catch() THEN the ESLint_Plugin SHALL report 
 *   an error suggesting TaskEither.orElse()
 * - WHEN Promise.then() is used THEN the ESLint_Plugin SHALL report an error suggesting TaskEither
 * - WHEN Promise.all() is used THEN the ESLint_Plugin SHALL report an error suggesting TE.sequenceArray
 * - WHEN Promise.race() is used THEN the ESLint_Plugin SHALL report an error
 */

import { ESLintUtils, TSESTree } from '@typescript-eslint/utils';
import { buildComprehensiveErrorMessage } from '../../utils/message-builder.js';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://github.com/grain-team/grain/blob/main/docs/eslint-rules/${name}.md`
);

/**
 * Promise.catch 的错误消息
 */
const NO_PROMISE_CATCH_MESSAGE = buildComprehensiveErrorMessage({
  title: '禁止使用 Promise.catch()',
  problemCode: `fetchData()
  .then(data => processData(data))
  .catch(error => handleError(error));`,
  reason: `Promise.catch() 隐藏了错误类型，使得：
  - 无法在类型系统中追踪错误
  - 错误处理逻辑与业务逻辑混杂
  - 难以进行函数组合`,
  architecturePrinciple: `Grain 项目使用 TaskEither 处理异步错误：
  - TE.orElse: 错误恢复，返回新的 TaskEither
  - TE.mapLeft: 转换错误类型
  - TE.fold: 最终处理成功和失败`,
  steps: [
    '将 Promise 转换为 TaskEither',
    '使用 TE.orElse 替代 .catch()',
    '使用 TE.map 替代 .then()',
  ],
  correctExample: `import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';

// 将 Promise 转换为 TaskEither
const fetchDataTE = TE.tryCatch(
  () => fetchData(),
  (error): AppError => ({ type: 'FETCH_ERROR', message: String(error) })
);

// 使用 pipe 组合
pipe(
  fetchDataTE,
  TE.map(processData),
  TE.orElse((error) => TE.right(fallbackData)),
  TE.fold(
    (error) => T.of(logger.error(error)),
    (data) => T.of(useData(data))
  )
)();`,
  docRef: 'https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html#orelse',
  steeringFile: '#fp-patterns - TaskEither 错误处理',
  relatedRules: ['no-try-catch', 'no-throw', 'fp-ts-patterns'],
});

/**
 * Promise.then 的错误消息
 */
const NO_PROMISE_THEN_MESSAGE = buildComprehensiveErrorMessage({
  title: '禁止使用 Promise.then()',
  problemCode: `fetchData().then(data => processData(data));`,
  reason: `Promise.then() 链式调用难以组合和测试：
  - 错误处理不显式
  - 难以中断链式调用
  - 类型推断不如 pipe 精确`,
  architecturePrinciple: `使用 TaskEither 和 pipe 进行异步操作组合：
  - TE.map: 转换成功值（替代 .then）
  - TE.chain: 链接多个 TaskEither（替代 .then 返回 Promise）
  - pipe: 函数组合，类型安全`,
  steps: [
    '将 Promise 包装为 TaskEither',
    '使用 TE.map 替代 .then()',
    '使用 pipe 组合操作',
  ],
  correctExample: `import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';

// ❌ 错误做法
fetchData().then(data => processData(data));

// ✅ 正确做法
pipe(
  TE.tryCatch(() => fetchData(), toAppError),
  TE.map(processData)
);`,
  docRef: 'https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html#map',
  steeringFile: '#fp-patterns - TaskEither 数据转换',
  relatedRules: ['no-promise-methods', 'fp-ts-patterns'],
});

/**
 * Promise.all 的错误消息
 */
const NO_PROMISE_ALL_MESSAGE = buildComprehensiveErrorMessage({
  title: '禁止使用 Promise.all()',
  problemCode: `const results = await Promise.all([
  fetchUser(id),
  fetchPosts(id),
  fetchComments(id),
]);`,
  reason: `Promise.all() 的错误处理不够精细：
  - 任一 Promise 失败则全部失败
  - 无法获取部分成功的结果
  - 错误类型不明确`,
  architecturePrinciple: `使用 fp-ts 的并行组合子：
  - TE.sequenceArray: 并行执行，全部成功或返回第一个错误
  - TE.sequenceSeqArray: 顺序执行
  - A.sequence(TE.ApplicativePar): 并行执行数组中的 TaskEither`,
  steps: [
    '将每个 Promise 转换为 TaskEither',
    '使用 TE.sequenceArray 或 A.sequence 组合',
    '处理组合后的结果',
  ],
  correctExample: `import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as A from 'fp-ts/Array';

// 并行执行多个 TaskEither
const fetchAllData = pipe(
  [fetchUserTE(id), fetchPostsTE(id), fetchCommentsTE(id)],
  A.sequence(TE.ApplicativePar)
);

// 或使用 sequenceArray
const fetchAllData2 = TE.sequenceArray([
  fetchUserTE(id),
  fetchPostsTE(id),
  fetchCommentsTE(id),
]);

// 使用 Do notation 更清晰
const fetchAllData3 = pipe(
  TE.Do,
  TE.apS('user', fetchUserTE(id)),
  TE.apS('posts', fetchPostsTE(id)),
  TE.apS('comments', fetchCommentsTE(id))
);`,
  docRef: 'https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html#sequencearray',
  steeringFile: '#fp-patterns - 并行操作',
  relatedRules: ['no-promise-methods', 'fp-ts-patterns'],
});

/**
 * Promise.race 的错误消息
 */
const NO_PROMISE_RACE_MESSAGE = buildComprehensiveErrorMessage({
  title: '禁止使用 Promise.race()',
  problemCode: `const result = await Promise.race([
  fetchWithTimeout(url, 5000),
  timeout(5000),
]);`,
  reason: `Promise.race() 语义不明确：
  - 难以区分成功和超时
  - 其他 Promise 的结果被丢弃
  - 错误处理复杂`,
  architecturePrinciple: `使用更明确的超时和竞争模式：
  - TE.timeout: 为 TaskEither 添加超时
  - 自定义竞争逻辑，明确处理各种情况`,
  steps: [
    '分析 race 的实际用途（通常是超时）',
    '使用 TE.timeout 或自定义超时逻辑',
    '明确处理超时和成功情况',
  ],
  correctExample: `import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';

// 使用自定义超时
const withTimeout = <E, A>(
  te: TE.TaskEither<E, A>,
  ms: number,
  timeoutError: E
): TE.TaskEither<E, A> =>
  () =>
    Promise.race([
      te(),
      new Promise<E.Either<E, A>>((resolve) =>
        setTimeout(() => resolve(E.left(timeoutError)), ms)
      ),
    ]);

// 使用
pipe(
  fetchDataTE,
  (te) => withTimeout(te, 5000, { type: 'TIMEOUT', message: '请求超时' })
);`,
  warnings: [
    'Promise.race 通常用于超时，考虑使用更明确的超时模式',
    '如果确实需要竞争语义，请添加注释说明原因',
  ],
  docRef: 'https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html',
  steeringFile: '#fp-patterns - 超时处理',
  relatedRules: ['no-promise-methods'],
});

/**
 * new Promise 的错误消息
 */
const NO_NEW_PROMISE_MESSAGE = buildComprehensiveErrorMessage({
  title: '禁止使用 new Promise()',
  problemCode: `const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));`,
  reason: `new Promise() 创建的 Promise 缺乏类型安全的错误处理`,
  architecturePrinciple: `使用 TaskEither 或 Task 替代 Promise：
  - T.delay: 延迟执行
  - TE.tryCatch: 包装可能失败的异步操作`,
  steps: [
    '确定操作是否可能失败',
    '可能失败使用 TE.tryCatch',
    '不会失败使用 T.of 或 T.delay',
  ],
  correctExample: `import * as T from 'fp-ts/Task';
import * as TE from 'fp-ts/TaskEither';

// 延迟 - 使用 Task
const delay = (ms: number): T.Task<void> =>
  () => new Promise(resolve => setTimeout(resolve, ms));

// 或使用 fp-ts-contrib 的 delay
import { delay } from 'fp-ts-contrib/Task';

// 可能失败的操作 - 使用 TaskEither
const fetchWithRetry = TE.tryCatch(
  () => fetch(url).then(r => r.json()),
  toAppError
);`,
  docRef: 'https://gcanti.github.io/fp-ts/modules/Task.ts.html',
  steeringFile: '#fp-patterns - Task 和 TaskEither',
  relatedRules: ['no-promise-methods', 'fp-ts-patterns'],
});

export default createRule({
  name: 'no-promise-methods',
  meta: {
    type: 'problem',
    docs: {
      description: 'Prohibit Promise methods and suggest TaskEither alternatives',
    },
    fixable: undefined,
    schema: [],
    messages: {
      noPromiseCatch: NO_PROMISE_CATCH_MESSAGE,
      noPromiseThen: NO_PROMISE_THEN_MESSAGE,
      noPromiseAll: NO_PROMISE_ALL_MESSAGE,
      noPromiseRace: NO_PROMISE_RACE_MESSAGE,
      noNewPromise: NO_NEW_PROMISE_MESSAGE,
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      // Detect Promise.catch(), Promise.then(), etc.
      CallExpression(node: TSESTree.CallExpression) {
        if (
          node.callee.type === 'MemberExpression' &&
          node.callee.property.type === 'Identifier'
        ) {
          const methodName = node.callee.property.name;
          const objectName = node.callee.object.type === 'Identifier' 
            ? node.callee.object.name 
            : null;

          // Check for Promise.all, Promise.race, Promise.resolve, Promise.reject
          if (objectName === 'Promise') {
            switch (methodName) {
              case 'all':
                context.report({ node, messageId: 'noPromiseAll' });
                break;
              case 'race':
                context.report({ node, messageId: 'noPromiseRace' });
                break;
            }
          }

          // Check for .then() and .catch() on any expression (Promise chain)
          switch (methodName) {
            case 'catch':
              context.report({ node, messageId: 'noPromiseCatch' });
              break;
            case 'then':
              context.report({ node, messageId: 'noPromiseThen' });
              break;
          }
        }
      },

      // Detect new Promise()
      NewExpression(node: TSESTree.NewExpression) {
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'Promise'
        ) {
          context.report({ node, messageId: 'noNewPromise' });
        }
      },
    };
  },
});
