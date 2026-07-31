export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  avatarColor: string;
  /** Set when this login's email matches a row in `customers` — the user is that customer, scoped to their own data by RLS. Null means admin (full access). */
  customerId: string | null;
}

export interface LoginInput {
  email: string;
  password: string;
}
