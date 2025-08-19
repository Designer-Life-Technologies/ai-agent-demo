import { Pool } from 'pg';
import DatabaseConnection from './connection';
import { Company, CreateCompanyInput, UpdateCompanyInput } from './types';

/**
 * Company database query functions for great-nature-ai database
 */
export class CompanyQueries {
  private pool: Pool;

  constructor() {
    this.pool = DatabaseConnection.getInstance().getPool();
  }

  /**
   * Get all companies with optional filtering
   */
  async getAllCompanies(filters?: { 
    industry?: string;
    businessSize?: string;
    country?: string;
    limit?: number;
    offset?: number;
  }): Promise<Company[]> {
    let query = 'SELECT * FROM "Company" WHERE 1=1';
    const values: any[] = [];
    let paramCount = 0;

    if (filters?.industry) {
      query += ` AND industry ILIKE $${++paramCount}`;
      values.push(`%${filters.industry}%`);
    }

    if (filters?.businessSize) {
      query += ` AND "businessSize" = $${++paramCount}`;
      values.push(filters.businessSize);
    }

    if (filters?.country) {
      query += ` AND country ILIKE $${++paramCount}`;
      values.push(`%${filters.country}%`);
    }

    query += ' ORDER BY name';

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
   * Get company by ID
   */
  async getCompanyById(id: string): Promise<Company | null> {
    const query = 'SELECT * FROM "Company" WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Get company by name
   */
  async getCompanyByName(name: string): Promise<Company | null> {
    const query = 'SELECT * FROM "Company" WHERE name ILIKE $1';
    const result = await this.pool.query(query, [name]);
    return result.rows[0] || null;
  }

  /**
   * Get company by registration number
   */
  async getCompanyByRegistrationNumber(registrationNumber: string): Promise<Company | null> {
    const query = 'SELECT * FROM "Company" WHERE "registrationNumber" = $1';
    const result = await this.pool.query(query, [registrationNumber]);
    return result.rows[0] || null;
  }

  /**
   * Search companies by name, industry, or description
   */
  async searchCompanies(searchTerm: string): Promise<Company[]> {
    const query = `
      SELECT * FROM "Company" 
      WHERE (name ILIKE $1 OR industry ILIKE $1 OR description ILIKE $1 OR "fullBusinessName" ILIKE $1)
      ORDER BY name
    `;
    const result = await this.pool.query(query, [`%${searchTerm}%`]);
    return result.rows;
  }

  /**
   * Get companies by location (city and/or country)
   */
  async getCompaniesByLocation(city?: string, country?: string): Promise<Company[]> {
    let query = 'SELECT * FROM "Company" WHERE 1=1';
    const values: any[] = [];
    let paramCount = 0;

    if (city) {
      query += ` AND city ILIKE $${++paramCount}`;
      values.push(`%${city}%`);
    }

    if (country) {
      query += ` AND country ILIKE $${++paramCount}`;
      values.push(`%${country}%`);
    }

    query += ' ORDER BY name';

    const result = await this.pool.query(query, values);
    return result.rows;
  }

  /**
   * Create a new company
   */
  async createCompany(companyData: CreateCompanyInput): Promise<Company> {
    const query = `
      INSERT INTO "Company" (
        name, industry, "fullBusinessName", "registrationNumber", "businessSize", 
        website, description, "contactEmail", "contactPhone", "addressLine1", 
        "addressLine2", city, state, country, postcode
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `;
    
    const values = [
      companyData.name,
      companyData.industry || null,
      companyData.fullBusinessName || null,
      companyData.registrationNumber || null,
      companyData.businessSize || null,
      companyData.website || null,
      companyData.description || null,
      companyData.contactEmail || null,
      companyData.contactPhone || null,
      companyData.addressLine1 || null,
      companyData.addressLine2 || null,
      companyData.city || null,
      companyData.state || null,
      companyData.country || null,
      companyData.postcode || null
    ];

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Update company by ID
   */
  async updateCompany(id: string, companyData: UpdateCompanyInput): Promise<Company | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    if (companyData.name !== undefined) {
      fields.push(`name = $${++paramCount}`);
      values.push(companyData.name);
    }

    if (companyData.industry !== undefined) {
      fields.push(`industry = $${++paramCount}`);
      values.push(companyData.industry);
    }

    if (companyData.fullBusinessName !== undefined) {
      fields.push(`"fullBusinessName" = $${++paramCount}`);
      values.push(companyData.fullBusinessName);
    }

    if (companyData.registrationNumber !== undefined) {
      fields.push(`"registrationNumber" = $${++paramCount}`);
      values.push(companyData.registrationNumber);
    }

    if (companyData.businessSize !== undefined) {
      fields.push(`"businessSize" = $${++paramCount}`);
      values.push(companyData.businessSize);
    }

    if (companyData.website !== undefined) {
      fields.push(`website = $${++paramCount}`);
      values.push(companyData.website);
    }

    if (companyData.description !== undefined) {
      fields.push(`description = $${++paramCount}`);
      values.push(companyData.description);
    }

    if (companyData.contactEmail !== undefined) {
      fields.push(`"contactEmail" = $${++paramCount}`);
      values.push(companyData.contactEmail);
    }

    if (companyData.contactPhone !== undefined) {
      fields.push(`"contactPhone" = $${++paramCount}`);
      values.push(companyData.contactPhone);
    }

    if (companyData.addressLine1 !== undefined) {
      fields.push(`"addressLine1" = $${++paramCount}`);
      values.push(companyData.addressLine1);
    }

    if (companyData.addressLine2 !== undefined) {
      fields.push(`"addressLine2" = $${++paramCount}`);
      values.push(companyData.addressLine2);
    }

    if (companyData.city !== undefined) {
      fields.push(`city = $${++paramCount}`);
      values.push(companyData.city);
    }

    if (companyData.state !== undefined) {
      fields.push(`state = $${++paramCount}`);
      values.push(companyData.state);
    }

    if (companyData.country !== undefined) {
      fields.push(`country = $${++paramCount}`);
      values.push(companyData.country);
    }

    if (companyData.postcode !== undefined) {
      fields.push(`postcode = $${++paramCount}`);
      values.push(companyData.postcode);
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(id);

    const query = `
      UPDATE "Company" 
      SET ${fields.join(', ')}
      WHERE id = $${++paramCount}
      RETURNING *
    `;

    const result = await this.pool.query(query, values);
    return result.rows[0] || null;
  }

  /**
   * Delete company by ID
   */
  async deleteCompany(id: string): Promise<boolean> {
    const query = 'DELETE FROM "Company" WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Get company count
   */
  async getCompanyCount(filters?: { industry?: string; businessSize?: string; country?: string }): Promise<number> {
    let query = 'SELECT COUNT(*) FROM "Company" WHERE 1=1';
    const values: any[] = [];
    let paramCount = 0;

    if (filters?.industry) {
      query += ` AND industry ILIKE $${++paramCount}`;
      values.push(`%${filters.industry}%`);
    }

    if (filters?.businessSize) {
      query += ` AND "businessSize" = $${++paramCount}`;
      values.push(filters.businessSize);
    }

    if (filters?.country) {
      query += ` AND country ILIKE $${++paramCount}`;
      values.push(`%${filters.country}%`);
    }

    const result = await this.pool.query(query, values);
    return parseInt(result.rows[0].count);
  }

  /**
   * Get companies with their user count
   */
  async getCompaniesWithUserCount(): Promise<Array<Company & { userCount: number }>> {
    const query = `
      SELECT c.*, COUNT(u.id) as "userCount"
      FROM "Company" c
      LEFT JOIN "User" u ON c.id = u."companyId"
      GROUP BY c.id
      ORDER BY c.name
    `;
    const result = await this.pool.query(query);
    return result.rows.map(row => ({
      ...row,
      userCount: parseInt(row.userCount)
    }));
  }
}
