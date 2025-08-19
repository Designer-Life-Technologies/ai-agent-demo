/**
 * Database module exports for great-nature-ai database
 * Provides query classes for User, Company, and Workplace tables
 */

export { UserQueries } from './userQueries';
export { CompanyQueries } from './companyQueries';
export { WorkplaceQueries } from './workplaceQueries';
export { default as DatabaseConnection } from './connection';

// Export types
export * from './types';

// Example usage:
// import { UserQueries, CompanyQueries, WorkplaceQueries } from './db';
// 
// const userQueries = new UserQueries();
// const users = await userQueries.getAllUsers();
// 
// const companyQueries = new CompanyQueries();
// const companies = await companyQueries.getAllCompanies();
// 
// const workplaceQueries = new WorkplaceQueries();
// const workplaces = await workplaceQueries.getAllWorkplaces();
