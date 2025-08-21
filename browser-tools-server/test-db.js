/* @source cursor @line_count 50 @branch main */

import { initializeDatabase, getConnection, closeDatabase } from './database.js';

async function testDatabaseConnection() {
  try {
    console.log('Testing database connection...');
    
    // 初始化数据库连接
    await initializeDatabase();
    console.log('✅ Database connection successful');
    
    // 测试连接池
    const connection = getConnection();
    const testConnection = await connection.getConnection();
    console.log('✅ Connection pool working');
    testConnection.release();
    
    // 测试基本查询
    const [rows] = await connection.execute('SELECT 1 as test');
    console.log('✅ Basic query successful:', rows);
    
    // 测试表是否存在
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE()
    `);
    console.log('✅ Available tables:', tables.map(t => t.TABLE_NAME));
    
    console.log('\n🎉 Database test completed successfully!');
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    console.error('Full error:', error);
  } finally {
    // 关闭数据库连接
    await closeDatabase();
    console.log('Database connection closed');
  }
}

// 运行测试
testDatabaseConnection();
