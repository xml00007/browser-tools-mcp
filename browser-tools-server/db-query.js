/* @source cursor @line_count 150 @branch main */

import { initializeDatabase, getConnection, closeDatabase } from './database.js';

async function queryDatabase() {
  try {
    console.log('Connecting to database...');
    await initializeDatabase();
    const connection = getConnection();
    
    console.log('\n=== Database Query Tool ===\n');
    
    // 查询HTTP请求统计
    console.log('📊 HTTP Requests Statistics:');
    const [httpStats] = await connection.execute(`
      SELECT 
        COUNT(*) as total_requests,
        COUNT(CASE WHEN response_status >= 400 THEN 1 END) as error_requests,
        COUNT(CASE WHEN response_status < 400 THEN 1 END) as success_requests
      FROM http_requests
    `);
    console.log(httpStats[0]);
    
    // 查询最近的HTTP请求
    console.log('\n📝 Recent HTTP Requests (last 5):');
    const [recentRequests] = await connection.execute(`
      SELECT origin, path, method, response_status, created_at
      FROM http_requests 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    recentRequests.forEach(req => {
      console.log(`  ${req.method} - ${req.response_status} (${req.created_at}) ${req.origin} ${req.path}`);
    });
    
    
    

    
    // 查询错误请求
    console.log('\n❌ Recent Error Requests (last 3):');
    const [errorRequests] = await connection.execute(`
      SELECT origin, path, method, response_status, created_at
      FROM http_requests 
      WHERE response_status >= 400
      ORDER BY created_at DESC 
      LIMIT 3
    `);
    errorRequests.forEach(req => {
      console.log(`${req.method} ${req.path} - ${req.response_status} - ${req.created_at}`);
    });
    
  } catch (error) {
    console.error('❌ Database query failed:', error.message);
  } finally {
    await closeDatabase();
    console.log('\nDatabase connection closed');
  }
}

// 检查命令行参数
const args = process.argv.slice(2);
if (args.length > 0) {
  console.log('Usage: node db-query.js');
  console.log('This tool shows database statistics and recent records');
  process.exit(1);
}

// 运行查询
queryDatabase();
