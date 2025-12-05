// 数据库迁移脚本
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { db, client } from './config';

async function runMigrations() {
  console.log('🔄 开始数据库迁移...');
  
  try {
    await migrate(db, { migrationsFolder: './drizzle' });
    console.log('✅ 数据库迁移完成');
  } catch (error) {
    console.error('❌ 数据库迁移失败:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations();

