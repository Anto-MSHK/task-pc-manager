import { type ReactNode, useCallback, useLayoutEffect, useRef } from 'react';

type AnalyticsTableHostProps = {
  loading: boolean;
  children: ReactNode;
};

/**
 * Wraps ProTable: flat shimmer only over the Ant Table grid (`div.ant-table` inside Spin),
 * not search, toolbar, or pagination. Table fades in when loading ends.
 *
 * Geometry sync runs only while `loading` is true — a ResizeObserver on the host during
 * idle was forcing layout while typing in the search form (inputs "jumping").
 */
export function AnalyticsTableHost({ loading, children }: AnalyticsTableHostProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const rafIdRef = useRef<number | null>(null);

  const syncSkeletonGeometry = useCallback(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }
    const tableEl =
      (root.querySelector('.ant-spin-container > .ant-table') as HTMLElement | null) ??
      (root.querySelector('.ant-table-wrapper .ant-table') as HTMLElement | null);
    if (!tableEl) {
      root.style.removeProperty('--sk-top');
      root.style.removeProperty('--sk-left');
      root.style.removeProperty('--sk-width');
      root.style.removeProperty('--sk-height');
      return;
    }
    const rootRect = root.getBoundingClientRect();
    const tableRect = tableEl.getBoundingClientRect();
    root.style.setProperty('--sk-top', `${Math.round(tableRect.top - rootRect.top)}px`);
    root.style.setProperty('--sk-left', `${Math.round(tableRect.left - rootRect.left)}px`);
    root.style.setProperty('--sk-width', `${Math.round(tableRect.width)}px`);
    root.style.setProperty('--sk-height', `${Math.round(tableRect.height)}px`);
  }, []);

  const scheduleSync = useCallback(() => {
    if (rafIdRef.current != null) {
      cancelAnimationFrame(rafIdRef.current);
    }
    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;
      syncSkeletonGeometry();
    });
  }, [syncSkeletonGeometry]);

  useLayoutEffect(() => {
    if (!loading) {
      if (rafIdRef.current != null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      return;
    }

    scheduleSync();
    const root = rootRef.current;
    if (!root) {
      return () => {
        if (rafIdRef.current != null) {
          cancelAnimationFrame(rafIdRef.current);
          rafIdRef.current = null;
        }
      };
    }

    const ro = new ResizeObserver(() => scheduleSync());
    ro.observe(root);

    const paintId = requestAnimationFrame(() => {
      requestAnimationFrame(scheduleSync);
    });

    return () => {
      ro.disconnect();
      cancelAnimationFrame(paintId);
      if (rafIdRef.current != null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [loading, scheduleSync, children]);

  return (
    <div
      ref={rootRef}
      className={`analytics-table-host-body${loading ? ' is-table-loading' : ''}`}
    >
      <div className="table-block-skeleton-host" aria-hidden>
        <div className="table-block-skeleton-block skeleton-shimmer" />
      </div>
      {children}
    </div>
  );
}
