/**
 * @fileoverview Rule to prohibit array and object mutations and suggest immutable operations
 * @author Grain Team
 */

import { ESLintUtils } from '@typescript-eslint/utils';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://github.com/grain-team/grain/blob/main/docs/eslint-rules/${name}.md`
);
import { TSESTree } from '@typescript-eslint/utils';

export default createRule({
  name: 'no-mutation',
  meta: {
    type: 'problem',
    docs: {
      description: 'Prohibit array and object mutations and suggest immutable operations',
    },
    fixable: undefined,
    schema: [],
    messages: {
      noArrayPush: [
        '❌ 禁止使用 array.push()！请使用 [...array, item] 保持不可变性。',
        '',
        '✅ 正确做法：',
        '  const newArray = [...array, newItem];',
        '  const multipleItems = [...array, item1, item2];',
      ].join('\n'),
      noArrayPop: [
        '❌ 禁止使用 array.pop()！请使用 array.slice(0, -1) 保持不可变性。',
        '',
        '✅ 正确做法：',
        '  const newArray = array.slice(0, -1);',
        '  const [lastItem, ...rest] = [...array].reverse();',
      ].join('\n'),
      noArrayShift: [
        '❌ 禁止使用 array.shift()！请使用 array.slice(1) 保持不可变性。',
        '',
        '✅ 正确做法：',
        '  const newArray = array.slice(1);',
        '  const [first, ...rest] = array;',
      ].join('\n'),
      noArrayUnshift: [
        '❌ 禁止使用 array.unshift()！请使用 [item, ...array] 保持不可变性。',
        '',
        '✅ 正确做法：',
        '  const newArray = [newItem, ...array];',
        '  const multipleItems = [item1, item2, ...array];',
      ].join('\n'),
      noArraySplice: [
        '❌ 禁止使用 array.splice()！请使用 slice() 和扩展运算符保持不可变性。',
        '',
        '✅ 正确做法：',
        '  // 删除元素',
        '  const newArray = [...array.slice(0, index), ...array.slice(index + 1)];',
        '  // 插入元素',
        '  const inserted = [...array.slice(0, index), newItem, ...array.slice(index)];',
        '  // 替换元素',
        '  const replaced = [...array.slice(0, index), newItem, ...array.slice(index + 1)];',
      ].join('\n'),
      noArraySort: [
        '❌ 禁止使用 array.sort()！请使用 [...array].sort() 或 fp-ts/Array 的 sort 函数。',
        '',
        '✅ 正确做法：',
        '  const sorted = [...array].sort();',
        '  const customSort = [...array].sort((a, b) => a.name.localeCompare(b.name));',
        '  // 或使用 fp-ts',
        '  import * as A from "fp-ts/Array";',
        '  const sorted = A.sort(Ord.contramap((item: Item) => item.name)(Ord.ordString))(array);',
      ].join('\n'),
      noArrayReverse: [
        '❌ 禁止使用 array.reverse()！请使用 [...array].reverse() 保持不可变性。',
        '',
        '✅ 正确做法：',
        '  const reversed = [...array].reverse();',
        '  // 或使用 fp-ts',
        '  import * as A from "fp-ts/Array";',
        '  const reversed = A.reverse(array);',
      ].join('\n'),
      noArrayFill: [
        '❌ 禁止使用 array.fill()！请使用 Array.from() 或其他不可变方法。',
        '',
        '✅ 正确做法：',
        '  const filled = Array.from({ length: array.length }, () => value);',
        '  const newArray = array.map(() => value);',
      ].join('\n'),
      noObjectMutation: [
        '❌ 禁止直接修改对象属性！请使用 { ...obj, prop: value } 保持不可变性。',
        '',
        '✅ 正确做法：',
        '  const updated = { ...obj, {{property}}: newValue };',
        '  const nested = { ...obj, nested: { ...obj.nested, prop: value } };',
        '  // 或使用 Immer',
        '  import { produce } from "immer";',
        '  const updated = produce(obj, draft => { draft.{{property}} = newValue; });',
      ].join('\n'),
      noDelete: [
        '❌ 禁止使用 delete 操作符！请使用对象解构和 rest 操作符。',
        '',
        '✅ 正确做法：',
        '  const { {{property}}, ...rest } = obj;',
        '  const newObj = rest;',
        '  // 或使用 es-toolkit',
        '  import { omit } from "es-toolkit";',
        '  const newObj = omit(obj, ["{{property}}"]);',
      ].join('\n'),
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      CallExpression(node: TSESTree.CallExpression) {
        if (
          node.callee.type === 'MemberExpression' &&
          node.callee.property.type === 'Identifier'
        ) {
          const methodName = node.callee.property.name;
          
          // Array mutation methods
          const arrayMutationMethods: Record<string, string> = {
            push: 'noArrayPush',
            pop: 'noArrayPop',
            shift: 'noArrayShift',
            unshift: 'noArrayUnshift',
            splice: 'noArraySplice',
            sort: 'noArraySort',
            reverse: 'noArrayReverse',
            fill: 'noArrayFill',
          };
          
          if (methodName in arrayMutationMethods) {
            const messageId = arrayMutationMethods[methodName] as keyof typeof arrayMutationMethods;
            context.report({
              node,
              messageId: messageId as any,
            });
          }
        }
      },
      
      AssignmentExpression(node: TSESTree.AssignmentExpression) {
        // Check for object property assignments
        if (
          node.operator === '=' &&
          node.left.type === 'MemberExpression'
        ) {
          let property = 'property';
          
          if (node.left.property.type === 'Identifier') {
            property = node.left.property.name;
          } else if (node.left.property.type === 'Literal') {
            property = String(node.left.property.value);
          }
          
          context.report({
            node,
            messageId: 'noObjectMutation',
            data: {
              property,
            },
          });
        }
        
        // Check for array index assignments
        if (
          node.operator === '=' &&
          node.left.type === 'MemberExpression' &&
          node.left.computed === true
        ) {
          context.report({
            node,
            messageId: 'noObjectMutation',
            data: {
              property: 'index',
            },
          });
        }
      },
      
      UnaryExpression(node: TSESTree.UnaryExpression) {
        // Check for delete operator
        if (
          node.operator === 'delete' &&
          node.argument.type === 'MemberExpression'
        ) {
          let property = 'property';
          
          if (node.argument.property.type === 'Identifier') {
            property = node.argument.property.name;
          } else if (node.argument.property.type === 'Literal') {
            property = String(node.argument.property.value);
          }
          
          context.report({
            node,
            messageId: 'noDelete',
            data: {
              property,
            },
          });
        }
      },
      
      UpdateExpression(node: TSESTree.UpdateExpression) {
        // Check for increment/decrement on object properties
        if (node.argument.type === 'MemberExpression') {
          let property = 'property';
          
          if (node.argument.property.type === 'Identifier') {
            property = node.argument.property.name;
          }
          
          context.report({
            node,
            messageId: 'noObjectMutation',
            data: {
              property,
            },
          });
        }
      },
    };
  },
});