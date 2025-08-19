import { Pool } from 'pg';
import DatabaseConnection from './connection';
import { User, CreateUserInput, UpdateUserInput, UserFullProfile } from './types';
import { CompanyQueries } from './companyQueries';
import { WorkplaceQueries } from './workplaceQueries';

/**
 * User database query functions for great-nature-ai database
 */
export class UserQueries {
  private pool: Pool;

  constructor() {
    this.pool = DatabaseConnection.getInstance().getPool();
  }

  /**
   * Get all users with optional filtering
   */
  async getAllUsers(filters?: { 
    companyId?: string; 
    limit?: number;
    offset?: number;
  }): Promise<User[]> {
    let query = 'SELECT * FROM "User" WHERE 1=1';
    const values: any[] = [];
    let paramCount = 0;

    if (filters?.companyId) {
      query += ` AND "companyId" = $${++paramCount}`;
      values.push(filters.companyId);
    }

    query += ' ORDER BY "firstname"';

    if (filters?.limit) {
      query += ` LIMIT $${++paramCount}`;
      values.push(filters.limit);
    }

    if (filters?.offset) {
      query += ` OFFSET $${++paramCount}`;
      values.push(filters.offset);
    }

    const result = await this.pool.query(query, values);
    return result.rows;
  }

  /**
   * Get user by ID
   */
  async getUserById(id: string): Promise<User | null> {
    const query = 'SELECT * FROM "User" WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<User | null> {
    const query = 'SELECT * FROM "User" WHERE email = $1';
    const result = await this.pool.query(query, [email]);
    return result.rows[0] || null;
  }

  /**
   * Get users by company ID
   */
  async getUsersByCompanyId(companyId: string): Promise<User[]> {
    const query = 'SELECT * FROM "User" WHERE "companyId" = $1 ORDER BY "firstname"';
    const result = await this.pool.query(query, [companyId]);
    return result.rows;
  }

  /**
   * Search users by name or email
   */
  async searchUsers(searchTerm: string): Promise<User[]> {
    const query = `
      SELECT * FROM "User" 
      WHERE ("firstname" ILIKE $1 OR "lastname" ILIKE $1 OR email ILIKE $1)
      ORDER BY "firstname"
    `;
    const result = await this.pool.query(query, [`%${searchTerm}%`]);
    return result.rows;
  }

  /**
   * Create a new user
   */
  async createUser(userData: CreateUserInput): Promise<User> {
    const query = `
      INSERT INTO "User" (email, password, firstname, lastname, "companyId")
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    
    const values = [
      userData.email,
      userData.password || null,
      userData.firstname,
      userData.lastname || null,
      userData.companyId || null
    ];

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Update user by ID
   */
  async updateUser(id: string, userData: UpdateUserInput): Promise<User | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    if (userData.email !== undefined) {
      fields.push(`email = $${++paramCount}`);
      values.push(userData.email);
    }

    if (userData.password !== undefined) {
      fields.push(`password = $${++paramCount}`);
      values.push(userData.password);
    }

    if (userData.firstname !== undefined) {
      fields.push(`firstname = $${++paramCount}`);
      values.push(userData.firstname);
    }

    if (userData.lastname !== undefined) {
      fields.push(`lastname = $${++paramCount}`);
      values.push(userData.lastname);
    }

    if (userData.companyId !== undefined) {
      fields.push(`"companyId" = $${++paramCount}`);
      values.push(userData.companyId);
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(id);

    const query = `
      UPDATE "User" 
      SET ${fields.join(', ')}
      WHERE id = $${++paramCount}
      RETURNING *
    `;

    const result = await this.pool.query(query, values);
    return result.rows[0] || null;
  }

  /**
   * Delete user by ID
   */
  async deleteUser(id: string): Promise<boolean> {
    const query = 'DELETE FROM "User" WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Get a user's full profile including their company details and all workplaces
   */
  async getUserFullProfile(id: string): Promise<UserFullProfile | null> {
    const user = await this.getUserById(id);
    if (!user) return null;

    // Reuse existing query helpers to avoid duplication
    const companyQueries = new CompanyQueries();
    const workplaceQueries = new WorkplaceQueries();

    const company = user.companyId
      ? await companyQueries.getCompanyById(user.companyId)
      : null;
    const workplaces = await workplaceQueries.getWorkplacesByUserId(user.id);

    return { user, company, workplaces };
  }

  /**
   * Get user count
   */
  async getUserCount(filters?: { companyId?: string }): Promise<number> {
    let query = 'SELECT COUNT(*) FROM "User" WHERE 1=1';
    const values: any[] = [];
    let paramCount = 0;

    if (filters?.companyId) {
      query += ` AND "companyId" = $${++paramCount}`;
      values.push(filters.companyId);
    }

    const result = await this.pool.query(query, values);
    return parseInt(result.rows[0].count);
  }

  /**
   * Get users with their company information
   */
  async getUsersWithCompany(): Promise<Array<User & { companyName?: string }>> {
    const query = `
      SELECT u.*, c.name as "companyName"
      FROM "User" u
      LEFT JOIN "Company" c ON u."companyId" = c.id
      ORDER BY u."firstname"
    `;
    const result = await this.pool.query(query);
    return result.rows;
  }
}
