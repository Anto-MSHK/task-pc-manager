import type { ProFormInstance } from '@ant-design/pro-components';
import { useCallback, useMemo, useRef } from 'react';
import type React from 'react';
import { proTableSearchBase } from '../config/proTable';

const TEXT_DEBOUNCE_MS = 500;
const SELECT_DEBOUNCE_MS = 0;

/**
 * Returns ProTable `search` props that auto-submit the form on every value
 * change. Text inputs are debounced; selects / numbers fire immediately.
 *
 * Uses `formRef.current.submit()` instead of `actionRef.reload()` so ProTable
 * picks up the **current** form state rather than stale cached params.
 */
export function useSearchFormProps(formRef: React.RefObject<ProFormInstance | undefined>) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onValuesChange = useCallback(
    (changedValues: Record<string, unknown>) => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);

      const hasTextChange = Object.values(changedValues).some((v) => typeof v === 'string');
      const delay = hasTextChange ? TEXT_DEBOUNCE_MS : SELECT_DEBOUNCE_MS;

      timerRef.current = setTimeout(() => {
        formRef.current?.submit();
      }, delay);
    },
    [formRef],
  );

  return useMemo(
    () => ({
      ...proTableSearchBase,
      submitter: {
        submitButtonProps: { style: { display: 'none' } },
      },
      onValuesChange,
    }),
    [onValuesChange],
  );
}
