export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Promocode {
  id: string;
  code: string;
  discountPercent: number;
  maxUsages?: number;
  maxUsagesPerUser?: number;
  dateFrom?: string;
  dateTo?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  id: string;
  userId: string;
  amount: number;
  discountAmount: number;
  finalAmount: number;
  promocodeId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse extends TokenPair {
  user: User;
}

export interface AnalyticsPage<T> {
  data: T[];
  total: number;
  current: number;
  pageSize: number;
}

export interface UsersAnalyticsRow {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  isActive: boolean;
  ordersCount: number;
  ordersWithPromocode: number;
  promoUsagesCount: number;
  totalSpent: number;
  totalFinalAmount: number;
  totalDiscount: number;
  lastOrderAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PromocodesAnalyticsRow {
  id: string;
  code: string;
  discountPercent: number;
  maxUsages: number | null;
  maxUsagesPerUser: number | null;
  dateFrom: string | null;
  dateTo: string | null;
  isActive: boolean;
  usageCount: number;
  uniqueUsers: number;
  totalDiscount: number;
  totalRevenue: number;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PromoUsageAnalyticsRow {
  id: string;
  promocodeId: string;
  promocodeCode: string;
  userId: string;
  userName: string;
  userEmail: string;
  orderId: string;
  orderAmount: number | null;
  orderFinalAmount: number | null;
  discountAmount: number;
  usedAt: string;
  createdAt: string;
}

export interface AnalyticsSummary {
  activeUsers: number;
  totalUsers: number;
  totalOrders: number;
  ordersWithPromo: number;
  totalRevenue: number;
  totalDiscount: number;
  promoUsages: number;
  activePromocodes: number;
}

export interface DashboardSeriesPoint {
  date: string;
  orders: number;
  revenue: number;
  promoUsages: number;
  discount: number;
}

export interface ApiErrorResponse {
  statusCode: number;
  message: string | string[];
  error?: string;
  path?: string;
  timestamp?: string;
}
