/**
 * Base ProTable `search` tweaks for stable layout on first paint / reload.
 *
 * - Fixed `labelWidth` avoids a second layout pass from `'auto'`.
 * - Fixed `span` makes column width independent of `RcResizeObserver` resize,
 *   preventing grid reflows.
 * - `defaultCollapsed: true` — long search rows stay collapsed by default.
 *
 * The `submitter` and `onValuesChange` are intentionally excluded here and
 * injected per-table via `useSearchFormProps` so each table gets auto-reload
 * on input change (with debounce for text) and a Reset-only toolbar.
 */
export const proTableSearchBase = {
  labelWidth: 132,
  /** Fixed grid span so container width changes do not reflow the search row */
  span: 8,
  layout: 'horizontal' as const,
  defaultCollapsed: true,
} as const;

/** @deprecated use `useSearchFormProps(actionRef)` instead */
export const proTableSearchForm = proTableSearchBase;
