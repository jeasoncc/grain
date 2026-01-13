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
	private data: Partial<WikiFileEntry> = {};

	/**
	 * 设置 ID
	 */
	id(v: string): this {
		this.data.id = v;
		return this;
	}

	/**
	 * 设置名称
	 */
	name(v: string): this {
		this.data.name = v;
		return this;
	}

	/**
	 * 设置别名
	 */
	alias(v: readonly string[]): this {
		this.data.alias = [...v];
		return this;
	}

	/**
	 * 设置内容
	 */
	content(v: string): this {
		this.data.content = v;
		return this;
	}

	/**
	 * 设置路径
	 */
	path(v: string): this {
		this.data.path = v;
		return this;
	}

	/**
	 * 从现有对象复制
	 */
	from(entry: WikiFileEntry): this {
		this.data = { ...entry };
		return this;
	}

	/**
	 * 构建不可变对象
	 */
	build(): WikiFileEntry {
		const result = wikiFileEntrySchema.parse(this.data);
		return Object.freeze(result);
	}
}
