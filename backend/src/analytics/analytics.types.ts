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

export interface CountRow {
  total: string | number;
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
