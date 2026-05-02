import type { ParamsType } from '@ant-design/pro-components';
import type { SortOrder } from 'antd/es/table/interface';
import type { Key } from 'react';
import { api } from '../config/api';
import { useDateRangeStore } from '../store/dateRangeStore';
import type { AnalyticsPage } from '../types/api';

type Sorter = Record<string, SortOrder>;
type Filter = Record<string, Key[] | null>;

const firstFilterValue = (value: Key[] | null | undefined): string | undefined => {
  if (!value || value.length === 0) {
    return undefined;
  }
  return String(value[0]);
};

export function useAnalyticsTable<T extends object>(endpoint: string) {
  const range = useDateRangeStore((state) => state.range);

  return async (
    params: ParamsType,
    sorter: Sorter,
    filter: Filter,
  ): Promise<{ data: T[]; success: boolean; total: number }> => {
    const sortEntry = Object.entries(sorter).find(([, order]) => Boolean(order));

    try {
      const response = await api.get<AnalyticsPage<T>>(endpoint, {
        params: {
          ...params,
          dateFrom: range[0].toISOString(),
          dateTo: range[1].toISOString(),
          sortField: sortEntry?.[0],
          sortOrder: sortEntry?.[1],
          isActive: firstFilterValue(filter.isActive),
        },
      });

      return {
        data: response.data.data,
        success: true,
        total: response.data.total,
      };
    } catch {
      return { data: [], success: false, total: 0 };
    }
  };
}
