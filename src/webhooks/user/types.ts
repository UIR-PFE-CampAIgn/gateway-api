export interface SupabaseUser {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  [key: string]: any;
}

export interface AppUser {
  _id: string; // UUID from our DB
  user_id: string; // Supabase Auth user id
  email: string;
  fullname?: string;
  phone?: string;
  address?: string;
  bio?: string;
  photo_url?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface AppUserResponse {
  supabaseUser: SupabaseUser;
  appUserData: AppUser;
}
