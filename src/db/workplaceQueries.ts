import { Pool } from 'pg';
import DatabaseConnection from './connection';
import { Workplace, CreateWorkplaceInput, UpdateWorkplaceInput } from './types';

/**
 * Workplace database query functions for great-nature-ai database
 */
export class WorkplaceQueries {
  private pool: Pool;

  constructor() {
    this.pool = DatabaseConnection.getInstance().getPool();
  }

  /**
   * Get all workplaces with optional filtering
   */
  async getAllWorkplaces(filters?: { 
    userId?: string;
    workplaceType?: string;
    country?: string;
    state?: string;
    limit?: number;
    offset?: number;
  }): Promise<Workplace[]> {
    let query = 'SELECT * FROM "Workplace" WHERE 1=1';
    const values: any[] = [];
    let paramCount = 0;

    if (filters?.userId) {
      query += ` AND "userId" = $${++paramCount}`;
      values.push(filters.userId);
    }

    if (filters?.workplaceType) {
      query += ` AND "workplaceType" = $${++paramCount}`;
      values.push(filters.workplaceType);
    }

    if (filters?.country) {
      query += ` AND country ILIKE $${++paramCount}`;
      values.push(`%${filters.country}%`);
    }

    if (filters?.state) {
      query += ` AND state ILIKE $${++paramCount}`;
      values.push(`%${filters.state}%`);
    }

    query += ' ORDER BY "createdAt" DESC';

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
   * Get workplace by ID
   */
  async getWorkplaceById(id: string): Promise<Workplace | null> {
    const query = 'SELECT * FROM "Workplace" WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Get workplace by code
   */
  async getWorkplaceByCode(code: string): Promise<Workplace | null> {
    const query = 'SELECT * FROM "Workplace" WHERE code = $1';
    const result = await this.pool.query(query, [code]);
    return result.rows[0] || null;
  }

  /**
   * Get workplaces by user ID
   */
  async getWorkplacesByUserId(userId: string): Promise<Workplace[]> {
    const query = 'SELECT * FROM "Workplace" WHERE "userId" = $1 ORDER BY "createdAt" DESC';
    const result = await this.pool.query(query, [userId]);
    return result.rows;
  }

  /**
   * Search workplaces by name or code
   */
  async searchWorkplaces(searchTerm: string): Promise<Workplace[]> {
    const query = `
      SELECT * FROM "Workplace" 
      WHERE (name ILIKE $1 OR code ILIKE $1)
      ORDER BY "createdAt" DESC
    `;
    const result = await this.pool.query(query, [`%${searchTerm}%`]);
    return result.rows;
  }

  /**
   * Get workplaces by location (country and/or state)
   */
  async getWorkplacesByLocation(country?: string, state?: string): Promise<Workplace[]> {
    let query = 'SELECT * FROM "Workplace" WHERE 1=1';
    const values: any[] = [];
    let paramCount = 0;

    if (country) {
      query += ` AND country ILIKE $${++paramCount}`;
      values.push(`%${country}%`);
    }

    if (state) {
      query += ` AND state ILIKE $${++paramCount}`;
      values.push(`%${state}%`);
    }

    query += ' ORDER BY "createdAt" DESC';

    const result = await this.pool.query(query, values);
    return result.rows;
  }

  /**
   * Get workplaces by type
   */
  async getWorkplacesByType(workplaceType: string): Promise<Workplace[]> {
    const query = 'SELECT * FROM "Workplace" WHERE "workplaceType" = $1 ORDER BY "createdAt" DESC';
    const result = await this.pool.query(query, [workplaceType]);
    return result.rows;
  }

  /**
   * Create a new workplace
   */
  async createWorkplace(workplaceData: CreateWorkplaceInput): Promise<Workplace> {
    const query = `
      INSERT INTO "Workplace" (name, country, "workplaceType", "otherWorkplaceType", code, "userId", "createdAt", state)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7)
      RETURNING *
    `;
    
    const values = [
      workplaceData.name,
      workplaceData.country,
      workplaceData.workplaceType,
      workplaceData.otherWorkplaceType || null,
      workplaceData.code,
      workplaceData.userId,
      workplaceData.state || null
    ];

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Update workplace by ID
   */
  async updateWorkplace(id: string, workplaceData: UpdateWorkplaceInput): Promise<Workplace | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    if (workplaceData.name !== undefined) {
      fields.push(`name = $${++paramCount}`);
      values.push(workplaceData.name);
    }

    if (workplaceData.country !== undefined) {
      fields.push(`country = $${++paramCount}`);
      values.push(workplaceData.country);
    }

    if (workplaceData.workplaceType !== undefined) {
      fields.push(`"workplaceType" = $${++paramCount}`);
      values.push(workplaceData.workplaceType);
    }

    if (workplaceData.otherWorkplaceType !== undefined) {
      fields.push(`"otherWorkplaceType" = $${++paramCount}`);
      values.push(workplaceData.otherWorkplaceType);
    }

    if (workplaceData.code !== undefined) {
      fields.push(`code = $${++paramCount}`);
      values.push(workplaceData.code);
    }

    if (workplaceData.userId !== undefined) {
      fields.push(`"userId" = $${++paramCount}`);
      values.push(workplaceData.userId);
    }

    if (workplaceData.state !== undefined) {
      fields.push(`state = $${++paramCount}`);
      values.push(workplaceData.state);
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(id);

    const query = `
      UPDATE "Workplace" 
      SET ${fields.join(', ')}
      WHERE id = $${++paramCount}
      RETURNING *
    `;

    const result = await this.pool.query(query, values);
    return result.rows[0] || null;
  }

  /**
   * Delete workplace by ID
   */
  async deleteWorkplace(id: string): Promise<boolean> {
    const query = 'DELETE FROM "Workplace" WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Get workplace count
   */
  async getWorkplaceCount(filters?: { userId?: string; workplaceType?: string; country?: string }): Promise<number> {
    let query = 'SELECT COUNT(*) FROM "Workplace" WHERE 1=1';
    const values: any[] = [];
    let paramCount = 0;

    if (filters?.userId) {
      query += ` AND "userId" = $${++paramCount}`;
      values.push(filters.userId);
    }

    if (filters?.workplaceType) {
      query += ` AND "workplaceType" = $${++paramCount}`;
      values.push(filters.workplaceType);
    }

    if (filters?.country) {
      query += ` AND country ILIKE $${++paramCount}`;
      values.push(`%${filters.country}%`);
    }

    const result = await this.pool.query(query, values);
    return parseInt(result.rows[0].count);
  }

  /**
   * Get workplaces with their user information
   */
  async getWorkplacesWithUser(): Promise<Array<Workplace & { userEmail?: string; userFirstname?: string }>> {
    const query = `
      SELECT w.*, u.email as "userEmail", u.firstname as "userFirstname"
      FROM "Workplace" w
      LEFT JOIN "User" u ON w."userId" = u.id
      ORDER BY w."createdAt" DESC
    `;
    const result = await this.pool.query(query);
    return result.rows;
  }

  /**
   * Get workplace statistics by type
   */
  async getWorkplaceStatsByType(): Promise<Array<{ workplaceType: string; count: number }>> {
    const query = `
      SELECT "workplaceType", COUNT(*) as count
      FROM "Workplace"
      GROUP BY "workplaceType"
      ORDER BY count DESC
    `;
    const result = await this.pool.query(query);
    return result.rows.map(row => ({
      workplaceType: row.workplaceType,
      count: parseInt(row.count)
    }));
  }
}
