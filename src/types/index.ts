export interface Product {
  id: string;
  name: string;
  description?: string;
  price?: number;
  stock: number;
  imageUrl?: string;
  imageGallery?: string;
  variations?: string;
  badgeNew?: boolean;
  badgePromo?: boolean;
  badgeBestSeller?: boolean;
  discountPercent?: number;
  active: boolean;
  categoryId?: string;
  categoryName?: string;
  createdAt: string;
}

export interface InventoryOperation {
  id: string;
  productId: string;
  productName: string;
  type: "add" | "adjust" | "remove";
  quantity: number;
  previousQuantity?: number;
  leadName?: string;
  leadPhone?: string;
  saleId?: string;
  timestamp: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
}

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'USER';
}

export interface SessionUser {
  sessionActive: true;
  tenantId: string;
  name: string;
  email: string;
  role: "ADMIN" | "USER";
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "USER";
  tenantId: string;
}

export interface AuthResponse {
  token: string;
  name: string;
  email: string;
  role: "ADMIN" | "USER";
  tenantId: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  companyName: string;
  userName: string;
  email: string;
  password: string;
  verificationCode: string;
}

export interface EmailCodePayload {
  email: string;
}

export interface PasswordResetPayload {
  email: string;
  verificationCode: string;
  newPassword: string;
}

export interface UpdateProfilePayload {
  name: string;
  email: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export interface ProductPayload {
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  imageGallery?: string;
  variations?: string;
  badgeNew?: boolean;
  badgePromo?: boolean;
  badgeBestSeller?: boolean;
  discountPercent?: number;
  categoryId: string;
}

export interface CategoryPayload {
  name: string;
  description?: string;
}

export interface CustomerPayload {
  name: string;
  email: string;
  phone: string;
}
