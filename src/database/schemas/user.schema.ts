import { randomUUID } from 'crypto';
import { HydratedDocument, Schema, model } from 'mongoose';

export interface User {
  _id: string; // UUID
  user_id: string; // Supabase Auth user id
  email: string;
  fullname?: string;
  photo_url?: string;
  phone?: string;
  address?: string;
  bio?: string;
  created_at?: Date;
  updated_at?: Date;
}

export type UserDocument = HydratedDocument<User>;

export const UserSchema = new Schema<User>(
  {
    _id: { type: String, default: () => randomUUID() },
    user_id: { type: String, required: true, index: true, unique: true },
    email: { type: String, required: true, index: true },
    fullname: { type: String },
    photo_url: { type: String },
    phone: { type: String },
    address: { type: String },
    bio: { type: String },
  },
  {
    collection: 'users',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    versionKey: false,
  },
);

export const UserModel = model<User>('User', UserSchema);
