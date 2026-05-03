import type { CSSProperties } from 'react';

export interface TableSkeletonProps {
  rows?: number;
  /** Used when `columnWeights` is omitted — equal-width columns. */
  columns?: number;
  /**
   * Relative widths vs real table (CSS `fr` tracks), same order as visible table columns.
   * When set, row cell count equals `columnWeights.length` and overrides `columns`.
   */
  columnWeights?: readonly number[];
}

export function TableSkeleton({ rows = 8, columns = 6, columnWeights }: TableSkeletonProps) {
  const colCount = columnWeights?.length ?? columns;
  const template = columnWeights?.length
    ? columnWeights.map((w) => `minmax(0, ${w}fr)`).join(' ')
    : undefined;

  const rootStyle = {
    '--table-skeleton-columns': colCount,
    ...(template ? { '--table-skeleton-template': template } : {}),
  } as CSSProperties;

  return (
    <div className="table-skeleton" style={rootStyle} aria-hidden="true">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div className="table-skeleton-row" key={rowIndex}>
          {Array.from({ length: colCount }).map((__, columnIndex) => (
            <span className="skeleton-shimmer table-skeleton-cell" key={columnIndex} />
          ))}
        </div>
      ))}
    </div>
  );
}
