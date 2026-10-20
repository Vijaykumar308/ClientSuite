import { useEffect, useRef, useState } from 'react';
import { CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, Filter, Search, X } from 'lucide-react';
import type { ReactNode } from 'react';
import './list-view.css';

export interface ListViewColumn<Row> {
  key: keyof Row;
  label: string;
  render?: (value: Row[keyof Row], row: Row) => ReactNode;
}

export interface ListViewFilter {
  key: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'number';
  placeholder?: string;
  options?: Array<{ label: string; value: string }>;
}

export interface ListViewDateFilter {
  label: string;
  fromKey: string;
  toKey: string;
}

export interface ListViewPagination {
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
}

interface ListViewProps<Row> {
  title: string;
  rows: Row[];
  rowKey: (row: Row) => string;
  columns: Array<ListViewColumn<Row>>;
  filters: ListViewFilter[];
  dateFilters?: ListViewDateFilter[];
  search: string;
  onSearchChange: (value: string) => void;
  filterValues: Record<string, string>;
  onFilterChange: (key: string, value: string) => void;
  pagination: ListViewPagination;
  onPageChange: (page: number) => void;
  loading?: boolean;
  error?: string | null;
  emptyTitle?: string;
  emptyDescription?: string;
  toolbarActions?: ReactNode;
  rowActions?: (row: Row) => ReactNode;
}

export const ListView = <Row,>({
  title,
  rows,
  rowKey,
  columns,
  filters,
  dateFilters = [],
  search,
  onSearchChange,
  filterValues,
  onFilterChange,
  pagination,
  onPageChange,
  loading = false,
  error = null,
  emptyTitle = 'Nothing here yet',
  emptyDescription = 'Items will appear here when they are added.',
  toolbarActions,
  rowActions,
}: ListViewProps<Row>) => {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [draftFilterValues, setDraftFilterValues] = useState<Record<string, string>>(filterValues);
  const filterPickerRef = useRef<HTMLDivElement>(null);
  const activeFilterCount = Object.values(filterValues).filter(Boolean).length;
  const filterKeys = [
    ...filters.map((filter) => filter.key),
    ...dateFilters.flatMap((filter) => [filter.fromKey, filter.toKey]),
  ];
  const hasDraftChanges = [...new Set([...filterKeys, ...Object.keys(filterValues)])].some(
    (key) => (draftFilterValues[key] ?? '') !== (filterValues[key] ?? '')
  );
  const firstItem = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1;
  const lastItem = Math.min(pagination.page * pagination.pageSize, pagination.total);

  useEffect(() => {
    if (!filtersOpen) return undefined;

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!filterPickerRef.current?.contains(event.target as Node)) {
        setFiltersOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFiltersOpen(false);
    };

    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [filtersOpen]);

  useEffect(() => {
    setDraftFilterValues(filterValues);
  }, [filterValues]);

  const toggleFilter = (key: string, checked: boolean) => {
    setSelectedFilters((current) =>
      checked ? [...current, key] : current.filter((selected) => selected !== key)
    );
    if (!checked) {
      const field = filters.find((filter) => filter.key === key);
      const dateFilter = dateFilters.find((filter) => filter.fromKey === key);
      if (field) {
        setDraftFilterValues((current) => ({ ...current, [field.key]: '' }));
      }
      if (dateFilter) {
        setDraftFilterValues((current) => ({
          ...current,
          [dateFilter.fromKey]: '',
          [dateFilter.toKey]: '',
        }));
      }
    }
  };

  const applyFilters = () => {
    [...new Set([...filterKeys, ...Object.keys(filterValues)])].forEach((key) => {
      const value = draftFilterValues[key] ?? '';
      if (value !== (filterValues[key] ?? '')) onFilterChange(key, value);
    });
  };

  const clearFilters = () => {
    [...new Set([...filterKeys, ...Object.keys(filterValues)])].forEach((key) => onFilterChange(key, ''));
    setDraftFilterValues({});
    setSelectedFilters([]);
  };

  const removeDateFilter = (filter: ListViewDateFilter) => {
    toggleFilter(filter.fromKey, false);
  };

  return (
    <section className="list-view">
      <div className="list-view-heading">
        <div>
          <h2>{title}</h2>
          <p>{pagination.total} {pagination.total === 1 ? 'record' : 'records'}</p>
        </div>
        {toolbarActions}
      </div>

      <div className="list-view-toolbar">
        <label className="list-view-search">
          <Search size={16} aria-hidden="true" />
          <span className="visually-hidden">Search {title.toLowerCase()}</span>
          <input
            type="search"
            value={search}
            placeholder={`Search ${title.toLowerCase()}...`}
            onChange={(event) => onSearchChange(event.target.value)}
          />
          {search && (
            <button type="button" aria-label="Clear search" onClick={() => onSearchChange('')}>
              <X size={14} />
            </button>
          )}
        </label>
        <div className="list-view-filter-picker" ref={filterPickerRef}>
          <button
            type="button"
            className={`list-view-filter-toggle${filtersOpen ? ' is-open' : ''}`}
            aria-expanded={filtersOpen}
            aria-haspopup="true"
            onClick={() => setFiltersOpen((open) => !open)}
          >
            <Filter size={15} />
            Filters
            {activeFilterCount > 0 && <span className="filter-count">{activeFilterCount}</span>}
            <ChevronDown size={14} />
          </button>
          {filtersOpen && (
            <div className="list-view-filter-menu" aria-label="Choose filters">
              <div className="filter-menu-heading">
                <strong>Choose filters</strong>
                <span>Select fields to filter by</span>
              </div>
              {filters.map((filter) => {
                const selected = selectedFilters.includes(filter.key);
                return (
                  <label className="filter-menu-option" key={filter.key}>
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={(event) => toggleFilter(filter.key, event.target.checked)}
                    />
                    <span className="filter-menu-checkbox">
                      {selected && <Check size={12} strokeWidth={2.5} />}
                    </span>
                    {filter.type === 'date' && <CalendarDays size={14} className="filter-menu-date-icon" />}
                    <span>{filter.label}</span>
                  </label>
                );
              })}
              {dateFilters.length > 0 && <div className="filter-menu-divider" />}
              {dateFilters.map((filter) => {
                const selected = selectedFilters.includes(filter.fromKey);
                return (
                  <label className="filter-menu-option" key={filter.fromKey}>
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={(event) => toggleFilter(filter.fromKey, event.target.checked)}
                    />
                    <span className="filter-menu-checkbox">
                      {selected && <Check size={12} strokeWidth={2.5} />}
                    </span>
                    <CalendarDays size={14} className="filter-menu-date-icon" />
                    <span>{filter.label}</span>
                  </label>
                );
              })}
              {(selectedFilters.length > 0 || hasDraftChanges) && (
                <button className="filter-menu-clear" type="button" onClick={clearFilters}>
                  Clear selected filters
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {selectedFilters.length > 0 && (
        <div className="list-view-active-filters" aria-label="Selected filters">
          {filters
            .filter((filter) => selectedFilters.includes(filter.key))
            .map((filter) => (
              <label className="active-filter-control" key={filter.key}>
                <span>{filter.label}</span>
                {filter.type === 'select' ? (
                  <select
                    value={draftFilterValues[filter.key] ?? ''}
                    onChange={(event) => setDraftFilterValues((current) => ({ ...current, [filter.key]: event.target.value }))}
                    aria-label={`Filter by ${filter.label}`}
                  >
                    <option value="">Any</option>
                    {filter.options?.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                ) : filter.type === 'date' || filter.type === 'number' ? (
                  <input
                    type={filter.type}
                    value={draftFilterValues[filter.key] ?? ''}
                    placeholder={filter.placeholder}
                    onChange={(event) => setDraftFilterValues((current) => ({ ...current, [filter.key]: event.target.value }))}
                    aria-label={`Filter by ${filter.label}`}
                  />
                ) : (
                  <input
                    type="text"
                    value={draftFilterValues[filter.key] ?? ''}
                    placeholder={filter.placeholder ?? `Filter by ${filter.label.toLowerCase()}`}
                    onChange={(event) => setDraftFilterValues((current) => ({ ...current, [filter.key]: event.target.value }))}
                    aria-label={`Filter by ${filter.label}`}
                  />
                )}
                <button type="button" aria-label={`Remove ${filter.label} filter`} onClick={() => toggleFilter(filter.key, false)}>
                  <X size={13} />
                </button>
              </label>
            ))}
          {dateFilters
            .filter((filter) => selectedFilters.includes(filter.fromKey))
            .map((filter) => (
              <fieldset className="active-filter-control active-date-filter" key={filter.fromKey}>
                <legend>{filter.label}</legend>
                <label>
                  <span>From</span>
                  <input
                    type="date"
                    value={draftFilterValues[filter.fromKey] ?? ''}
                    onChange={(event) => setDraftFilterValues((current) => ({ ...current, [filter.fromKey]: event.target.value }))}
                    aria-label={`${filter.label} from`}
                  />
                </label>
                <label>
                  <span>To</span>
                  <input
                    type="date"
                    value={draftFilterValues[filter.toKey] ?? ''}
                    onChange={(event) => setDraftFilterValues((current) => ({ ...current, [filter.toKey]: event.target.value }))}
                    aria-label={`${filter.label} to`}
                  />
                </label>
                <button type="button" aria-label={`Remove ${filter.label} filter`} onClick={() => removeDateFilter(filter)}>
                  <X size={13} />
                </button>
              </fieldset>
            ))}
          <button
            className="active-filter-apply"
            type="button"
            onClick={applyFilters}
            disabled={!hasDraftChanges}
          >
            Apply filters
          </button>
          <button className="active-filter-clear" type="button" onClick={clearFilters}>
            Clear all
          </button>
        </div>
      )}

      {error && <div className="list-view-error" role="alert">{error}</div>}

      <div className="list-view-table-wrap">
        <table className="list-view-table">
          <thead>
            <tr>
              {columns.map((column) => <th key={String(column.key)} scope="col">{column.label}</th>)}
              {rowActions && <th scope="col" className="list-view-actions-heading">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td className="list-view-message" colSpan={columns.length + Number(Boolean(rowActions))}>Loading {title.toLowerCase()}…</td></tr>
            )}
            {!loading && !error && rows.map((row) => (
              <tr key={rowKey(row)}>
                {columns.map((column) => (
                  <td key={String(column.key)}>
                    {column.render
                      ? column.render(row[column.key], row)
                      : String(row[column.key] ?? '—')}
                  </td>
                ))}
                {rowActions && <td className="list-view-row-actions">{rowActions(row)}</td>}
              </tr>
            ))}
            {!loading && !error && rows.length === 0 && (
              <tr>
                <td className="list-view-empty" colSpan={columns.length + Number(Boolean(rowActions))}>
                  <strong>{activeFilterCount || search ? 'No matching records' : emptyTitle}</strong>
                  <span>
                    {activeFilterCount || search
                      ? 'Try adjusting your search or filters.'
                      : emptyDescription}
                  </span>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <footer className="list-view-pagination">
        <span>Showing {firstItem}–{lastItem} of {pagination.total}</span>
        <div>
          <button
            type="button"
            aria-label="Previous page"
            disabled={loading || pagination.page <= 1}
            onClick={() => onPageChange(pagination.page - 1)}
          >
            <ChevronLeft size={15} />
          </button>
          <span>Page {pagination.page} of {Math.max(pagination.pageCount, 1)}</span>
          <button
            type="button"
            aria-label="Next page"
            disabled={loading || pagination.page >= pagination.pageCount}
            onClick={() => onPageChange(pagination.page + 1)}
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </footer>
    </section>
  );
};
