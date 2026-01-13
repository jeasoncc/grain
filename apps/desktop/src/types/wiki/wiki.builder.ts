/**
 * @file types/wiki/wiki.builder.ts
 * @description Wiki 数据构建器
 */

import type { WikiFileEntry } from "./wiki.schema";
import { wikiFileEntrySchema } from "./wiki.schema";

/**
 * Wiki 文件条目构建器
 *
 * 用于构建符合规范的 WikiFileEntry 对象
 */
export class WikiFileEntryBuilder {
	private readonly data: Partial<WikiFileEntry> = {};

	/**
	 * 设置 ID
	 */
	id(v: string): this {
		return Object.assign(Object.create(Object.getPrototypeOf(this)), this, {
			data: { ...this.data, id: v },
		});
	}

	/**
	 * 设置名称
	 */
	name(v: string): this {
		return Object.assign(Object.create(Object.getPrototypeOf(this)), this, {
			data: { ...this.data, name: v },
		});
	}

	/**
	 * 设置别名
	 */
	alias(v: readonly string[]): this {
		return Object.assign(Object.create(Object.getPrototypeOf(this)), this, {
			data: { ...this.data, alias: v as string[] },
		});
	}

	/**
	 * 设置内容
	 */
	content(v: string): this {
		return Object.assign(Object.create(Object.getPrototypeOf(this)), this, {
			data: { ...this.data, content: v },
		});
	}

	/**
	 * 设置路径
	 */
	path(v: string): this {
		return Object.assign(Object.create(Object.getPrototypeOf(this)), this, {
			data: { ...this.data, path: v },
		});
	}

	/**
	 * 从现有对象复制
	 */
	from(entry: WikiFileEntry): this {
		return Object.assign(Object.create(Object.getPrototypeOf(this)), this, {
			data: { ...entry },
		});
	}

	/**
	 * 构建不可变对象
	 */
	build(): WikiFileEntry {
		const result = wikiFileEntrySchema.parse(this.data);
		return Object.freeze(result);
	}
}
