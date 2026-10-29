export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    [key: string]: any;
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

export type PaymentMethodType = 'CASH' | 'CARD' | 'EVC_PLUS' | 'EDAHAB' | 'ZAAD' | 'BANK_TRANSFER';
