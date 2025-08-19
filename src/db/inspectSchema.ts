import { Pool } from 'pg';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.dev' });

async function inspectDatabaseSchema() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to database...');
    
    // Test connection
    const testResult = await pool.query('SELECT current_database(), current_schema()');
    console.log('Connected to:', testResult.rows[0]);

    // Get all tables
    const tablesQuery = `
      SELECT table_name, table_schema 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;
    const tablesResult = await pool.query(tablesQuery);
    console.log('\nTables found:');
    tablesResult.rows.forEach(row => {
      console.log(`- ${row.table_name}`);
    });

    // Inspect the actual tables found
    const targetTables = ['User', 'Company', 'Workplace'];
    
    for (const tableName of targetTables) {
      try {
        const columnsQuery = `
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns 
          WHERE table_name = $1 AND table_schema = 'public'
          ORDER BY ordinal_position;
        `;
        const columnsResult = await pool.query(columnsQuery, [tableName]);
        
        if (columnsResult.rows.length > 0) {
          console.log(`\n${tableName.toUpperCase()} table structure:`);
          columnsResult.rows.forEach(col => {
            console.log(`  ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
          });
        }
      } catch (error) {
        if (error instanceof Error) {
          console.error(`Error inspecting ${tableName}:`, error.message);
        } else {
          console.error(`Error inspecting ${tableName}:`, error);
        }
      }
    }

  } catch (error) {
    console.error('Database connection error:', error);
  } finally {
    await pool.end();
  }
}

inspectDatabaseSchema();
