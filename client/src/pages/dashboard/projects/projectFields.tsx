import { Link } from 'react-router-dom';
import type { ListViewColumn, ListViewDateFilter, ListViewFilter } from '../../../components/list-view/ListView';

export interface ProjectRecord {
  id: string;
  clientId: string;
  name: string;
  description: string | null;
  status: string;
  price: string;
  currency: string;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  client: { id: string; name: string; email: string };
}

export interface ProjectClientOption {
  id: string;
  name: string;
  email: string;
  status: string;
}

export const createProjectColumns = (): Array<ListViewColumn<ProjectRecord>> => [
  {
    key: 'name',
    label: 'Project',
    render: (_value, project) => (
      <Link className="project-name-link" to={`/dashboard/projects/${project.id}`}>{project.name}</Link>
    ),
  },
  { key: 'client', label: 'Client', render: (_value, project) => project.client.name },
  { key: 'description', label: 'Description' },
  {
    key: 'status',
    label: 'Status',
    render: (value) => <span className="client-status-badge">{String(value).toLowerCase().replace(/_/g, ' ')}</span>,
  },
  {
    key: 'price',
    label: 'Price',
    render: (_value, project) => new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: project.currency,
    }).format(Number(project.price)),
  },
  {
    key: 'dueDate',
    label: 'Deadline',
    render: (value) => value ? new Date(String(value)).toLocaleDateString() : '—',
  },
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

export const createProjectFilters = (clients: ProjectClientOption[]): ListViewFilter[] => [
  { key: 'name', label: 'Project name', type: 'text' },
  {
    key: 'clientId',
    label: 'Client',
    type: 'select',
    options: clients
      .filter((client) => client.status !== 'ARCHIVED')
      .map((client) => ({ label: client.name, value: client.id })),
  },
  { key: 'description', label: 'Description', type: 'text' },
  { key: 'status', label: 'Status', type: 'select', options: [
    { label: 'Draft', value: 'DRAFT' },
    { label: 'Preview shared', value: 'PREVIEW_SHARED' },
    { label: 'Changes requested', value: 'CHANGES_REQUESTED' },
    { label: 'Approved', value: 'APPROVED' },
    { label: 'Awaiting payment', value: 'AWAITING_PAYMENT' },
    { label: 'Paid', value: 'PAID' },
    { label: 'Delivered', value: 'DELIVERED' },
    { label: 'Completed', value: 'COMPLETED' },
    { label: 'Cancelled', value: 'CANCELLED' },
  ] },
  { key: 'price', label: 'Price', type: 'number' },
  { key: 'dueDate', label: 'Deadline', type: 'date' },
];

export const projectDateFilters: ListViewDateFilter[] = [
  { label: 'Created date', fromKey: 'createdAtFrom', toKey: 'createdAtTo' },
  { label: 'Modified date', fromKey: 'updatedAtFrom', toKey: 'updatedAtTo' },
];
