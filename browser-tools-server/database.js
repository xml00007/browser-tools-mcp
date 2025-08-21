/* @source cursor @line_count 150 @branch main */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

// 默认数据库配置
const defaultConfig = {
  origin: process.env.DB_origin || 'localorigin',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'browser_tools',
  charset: 'utf8mb4',
  timezone: '+00:00'
};

// 数据库连接池
let connectionPool = null;

/**
 * 初始化数据库连接池
 */
export async function initializeDatabase() {
  try {
    console.log('正在初始化数据库连接...');
    
    // 创建连接池
    connectionPool = mysql.createPool({
      ...defaultConfig,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    // 测试连接
    const connection = await connectionPool.getConnection();
    console.log('数据库连接成功！');
    
    // 创建数据库表
    await createTables(connection);
    
    connection.release();
  } catch (error) {
    console.error('数据库连接失败:', error);
    throw error;
  }
}

/**
 * 创建数据库表
 */
async function createTables(connection) {
  try {
    // 创建HTTP请求日志表
    const createHttpRequestsTable = `
      CREATE TABLE IF NOT EXISTS http_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        origin VARCHAR(255) NOT NULL,
        path VARCHAR(255) NOT NULL,
        method VARCHAR(10) NOT NULL,
        request_body JSON,
        request_headers JSON,
        request_cookies JSON,
        response_status INT,
        response_body JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_path (path),
        INDEX idx_method (method)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;
    await connection.execute(createHttpRequestsTable);
    
    console.log('数据库表创建成功！');
  } catch (error) {
    console.error('创建数据库表失败:', error);
    throw error;
  }
}

/**
 * 获取数据库连接
 */
export function getConnection() {
  if (!connectionPool) {
    throw new Error('数据库未初始化，请先调用 initializeDatabase()');
  }
  return connectionPool;
}

/**
 * 记录HTTP请求到数据库
 */
export async function logHttpRequest(data) {
  try {
    const connection = getConnection();
    
    const query = `
      INSERT INTO http_requests (
        origin, path, method, request_body, request_cookies, request_headers, 
        response_status, response_body
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const values = [
      data.origin,
      data.path,
      data.method,
      JSON.stringify(data.requestBody || null),
      JSON.stringify(data.requestCookies || null),
      JSON.stringify(data.requestHeaders || null),
      data.responseStatus || null,
      JSON.stringify(data.responseBody || null),
    ];

    console.log('values',values)
    
    await connection.execute(query, values);
  } catch (error) {
    console.error('记录HTTP请求失败:', error);
    // 不抛出错误，避免影响主业务流程
  }
}


/**
 * 关闭数据库连接
 */
export async function closeDatabase() {
  if (connectionPool) {
    await connectionPool.end();
    connectionPool = null;
    console.log('数据库连接已关闭');
  }
}
