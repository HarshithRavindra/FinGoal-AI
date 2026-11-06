export interface User {
  id: number;
  email: string;
  full_name: string;
  created_at: string;
}

export interface LoginRequest {
  username: string; // OAuth2 password flow username is email
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

