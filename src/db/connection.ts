import { Pool, PoolConfig } from 'pg';
import * as dotenv from 'dotenv';

// Load environment variables from .env.dev
dotenv.config({ path: '.env.dev' });

/**
 * Database connection pool for Neon PostgreSQL
 * Manages connections to the great-nature-ai database
 */
class DatabaseConnection {
  private pool: Pool;
  private static instance: DatabaseConnection;

  private constructor() {
    // Allow configuring via env with safe defaults
    const max = Number(process.env.DB_POOL_MAX ?? 20);
    const idleTimeoutMillis = Number(process.env.DB_IDLE_TIMEOUT_MS ?? 30000);
    const connectionTimeoutMillis = Number(
      process.env.DB_CONNECTION_TIMEOUT_MS ?? 10000,
    );

    const config: PoolConfig = {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max,
      idleTimeoutMillis,
      connectionTimeoutMillis,
      keepAlive: true,
    };

    this.pool = new Pool(config);

    // Handle pool errors
    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
      process.exit(-1);
    });
  }

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  public getPool(): Pool {
    return this.pool;
  }

  public async testConnection(): Promise<boolean> {
    try {
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      return true;
    } catch (error) {
      console.error('Database connection test failed:', error);
      return false;
    }
  }

  public async close(): Promise<void> {
    await this.pool.end();
  }
}

export default DatabaseConnection;
