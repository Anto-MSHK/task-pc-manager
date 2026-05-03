import type { ActionType, ParamsType, ProFormInstance } from '@ant-design/pro-components';
import type { SortOrder } from 'antd/es/table/interface';
import { useCallback, useRef, useState } from 'react';
import { api } from '../config/api';
import { useDateRangeStore } from '../store/dateRangeStore';
import type { AnalyticsPage } from '../types/api';

type Sorter = Record<string, SortOrder>;

/** Pick only explicitly-declared search field params from the ProTable params object */
const ALLOWED_SEARCH_KEYS = new Set([
  'current',
  'pageSize',
  'search',
  'isActive',
  'minOrders',
  'maxOrders',
  'minUsageCount',
  'maxUsageCount',
  'minDiscountAmount',
  'maxDiscountAmount',
]);

export function useAnalyticsTable<T extends object>(endpoint: string) {
  const range = useDateRangeStore((state) => state.range);
  const [loading, setLoading] = useState(true);
  const requestIdRef = useRef(0);
  const actionRef = useRef<ActionType>();
  const formRef = useRef<ProFormInstance>();

  const request = useCallback(
    async (
      params: ParamsType,
      sorter: Sorter,
    ): Promise<{ data: T[]; success: boolean; total: number }> => {
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      setLoading(true);
      const sortEntry = Object.entries(sorter).find(([, order]) => Boolean(order));

      const safeParams = Object.fromEntries(
        Object.entries(params).filter(([key]) => ALLOWED_SEARCH_KEYS.has(key)),
      );

      try {
        const response = await api.get<AnalyticsPage<T>>(endpoint, {
          params: {
            ...safeParams,
            dateFrom: range[0].toISOString(),
            dateTo: range[1].toISOString(),
            sortField: sortEntry?.[0],
            sortOrder: sortEntry?.[1],
          },
        });

        return {
          data: response.data.data,
          success: true,
          total: response.data.total,
        };
      } catch {
        return { data: [], success: false, total: 0 };
      } finally {
        if (requestIdRef.current === requestId) {
          setLoading(false);
        }
      }
    },
    [endpoint, range],
  );

  return { loading, request, actionRef, formRef };
}
