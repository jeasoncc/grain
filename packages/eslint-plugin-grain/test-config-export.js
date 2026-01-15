// Quick test to verify configuration exports
const { strictConfig, legacyConfig } = require('./src/configs/index.ts');

console.log('✅ Strict config exported:', !!strictConfig);
console.log('✅ Legacy config exported:', !!legacyConfig);
console.log('✅ Strict rules count:', Object.keys(strictConfig.rules).length);
console.log('✅ Legacy rules count:', Object.keys(legacyConfig.rules).length);
