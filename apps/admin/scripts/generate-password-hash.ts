import bcrypt from "bcrypt"

/**
 * 生成密码哈希脚本
 * Generate password hash script
 *
 * 使用方法 / Usage:
 * bun run scripts/generate-password-hash.ts "YourPassword123!"
 */

const password = process.argv[2]

if (!password) {
	console.error("错误：请提供密码参数")
	console.error("用法：bun run scripts/generate-password-hash.ts <password>")
	process.exit(1)
}

const saltRounds = 10

bcrypt.hash(password, saltRounds, (err, hash) => {
	if (err) {
		console.error("生成哈希失败:", err)
		process.exit(1)
	}

	console.log("\n✓ 密码哈希生成成功！\n")
	console.log("将以下内容添加到 .env.local 文件：\n")
	console.log(`ADMIN_PASSWORD_HASH=${hash}`)
	console.log("\n")
})
