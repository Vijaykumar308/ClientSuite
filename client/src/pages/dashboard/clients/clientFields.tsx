import type { ListViewColumn, ListViewDateFilter, ListViewFilter } from '../../../components/list-view/ListView';

export interface ClientRecord {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  status: 'LEAD' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export const clientColumns: Array<ListViewColumn<ClientRecord>> = [
  {
    key: 'name',
    label: 'Client',
    render: (value) => <span className="client-name-cell">{String(value)}</span>,
  },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'company', label: 'Company' },
  {
    key: 'status',
    label: 'Status',
    render: (value) => {
      const status = String(value);
      return <span className={`client-status-badge status-${status.toLowerCase()}`}>{status.toLowerCase()}</span>;
    },
  },
  { key: 'notes', label: 'Notes' },
  {
    key: 'createdAt',
    label: 'Created',
    render: (value) => new Date(String(value)).toLocaleDateString(),
  },
  {
    key: 'updatedAt',
    label: 'Modified',
    render: (value) => new Date(String(value)).toLocaleDateString(),
  },
];

export const clientFilters: ListViewFilter[] = [
  { key: 'name', label: 'Name', type: 'text' },
  { key: 'email', label: 'Email', type: 'text' },
  { key: 'phone', label: 'Phone', type: 'text' },
  { key: 'company', label: 'Company', type: 'text' },
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { label: 'Lead', value: 'LEAD' },
      { label: 'Active', value: 'ACTIVE' },
      { label: 'Completed', value: 'COMPLETED' },
      { label: 'Archived', value: 'ARCHIVED' },
    ],
  },
  { key: 'notes', label: 'Notes', type: 'text' },
];

export const clientDateFilters: ListViewDateFilter[] = [
  { label: 'Created date', fromKey: 'createdAtFrom', toKey: 'createdAtTo' },
  { label: 'Modified date', fromKey: 'updatedAtFrom', toKey: 'updatedAtTo' },
];
