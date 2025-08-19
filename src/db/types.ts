/**
 * Database entity types based on actual great-nature-ai database schema
 */

export interface User {
  id: string;
  email: string;
  password?: string;
  firstname: string;
  lastname?: string;
  companyId?: string;
}

export interface Company {
  id: string;
  name: string;
  industry?: string;
  fullBusinessName?: string;
  registrationNumber?: string;
  businessSize?: string;
  website?: string;
  description?: string;
  contactEmail?: string;
  contactPhone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  country?: string;
  postcode?: string;
}

export interface Workplace {
  id: string;
  name: string;
  country: string;
  workplaceType: string;
  otherWorkplaceType?: string;
  code: string;
  userId: string;
  createdAt: Date;
  state?: string;
}

export interface CreateUserInput {
  email: string;
  password?: string;
  firstname: string;
  lastname?: string;
  companyId?: string;
}

export interface UpdateUserInput {
  email?: string;
  password?: string;
  firstname?: string;
  lastname?: string;
  companyId?: string;
}

export interface CreateCompanyInput {
  name: string;
  industry?: string;
  fullBusinessName?: string;
  registrationNumber?: string;
  businessSize?: string;
  website?: string;
  description?: string;
  contactEmail?: string;
  contactPhone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  country?: string;
  postcode?: string;
}

export interface UpdateCompanyInput {
  name?: string;
  industry?: string;
  fullBusinessName?: string;
  registrationNumber?: string;
  businessSize?: string;
  website?: string;
  description?: string;
  contactEmail?: string;
  contactPhone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  country?: string;
  postcode?: string;
}

export interface CreateWorkplaceInput {
  name: string;
  country: string;
  workplaceType: string;
  otherWorkplaceType?: string;
  code: string;
  userId: string;
  state?: string;
}

export interface UpdateWorkplaceInput {
  name?: string;
  country?: string;
  workplaceType?: string;
  otherWorkplaceType?: string;
  code?: string;
  userId?: string;
  state?: string;
}

/**
 * Composite shape for fetching a user's full profile, including:
 * - the user record
 * - the associated company (may be null)
 * - all workplaces owned by the user
 */
export interface UserFullProfile {
  user: User;
  company: Company | null;
  workplaces: Workplace[];
}
