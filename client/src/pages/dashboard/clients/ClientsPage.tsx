import { useEffect, useState } from 'react';
import axios from 'axios';
import { Plus, UsersRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../../api/client';
import { ListView, type ListViewPagination } from '../../../components/list-view/ListView';
import {
  clientColumns,
  clientDateFilters,
  clientFilters,
  type ClientRecord,
} from './clientFields';
import './clients.css';

interface ClientListResponse {
  success: boolean;
  data: ClientRecord[];
  pagination: ListViewPagination;
}

interface ClientResponse {
  success: boolean;
  data: ClientRecord;
}

const initialPagination: ListViewPagination = {
  page: 1,
  pageSize: 20,
  total: 0,
  pageCount: 0,
};

const isClientListResponse = (value: unknown): value is ClientListResponse => {
  if (!value || typeof value !== 'object') return false;

  const response = value as Partial<ClientListResponse>;
  const page = response.pagination?.page;
  const pageSize = response.pagination?.pageSize;
  const total = response.pagination?.total;
  const pageCount = response.pagination?.pageCount;

  return (
    response.success === true &&
    Array.isArray(response.data) &&
    typeof page === 'number' &&
    typeof pageSize === 'number' &&
    typeof total === 'number' &&
    typeof pageCount === 'number'
  );
};

const formatApiDate = (date: string, endOfDay = false): string => {
  const value = new Date(`${date}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}`);
  return value.toISOString();
};

const errorMessage = (error: unknown): string => {
  if (axios.isAxiosError<{ error?: { message?: string } }>(error)) {
    return error.response?.data?.error?.message ?? 'Unable to connect to the server.';
  }
  if (error instanceof Error) return error.message;
  return 'Unable to load clients. Please try again.';
};

export const ClientsPage = () => {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [pagination, setPagination] = useState(initialPagination);
  const [search, setSearch] = useState('');
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [rowActionError, setRowActionError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      const loadClients = async () => {
        setLoading(true);
        setError(null);
        try {
          const params = new URLSearchParams({
            page: String(pagination.page),
            pageSize: String(pagination.pageSize),
          });
          if (search.trim()) params.set('search', search.trim());
          Object.entries(filterValues).forEach(([key, value]) => {
            if (!value) return;
            if (key.endsWith('From') || key.endsWith('To')) {
              params.set(key, formatApiDate(value, key.endsWith('To')));
            } else {
              params.set(key, value);
            }
          });

          const response = await apiClient.get<ClientListResponse>(
            `/tenant/clients?${params.toString()}`,
            { signal: controller.signal }
          );
          if (!isClientListResponse(response.data)) {
            throw new Error('The server returned an invalid client list response. Restart the API server and try again.');
          }
          setClients(response.data.data);
          setPagination(response.data.pagination);
        } catch (requestError) {
          if (!axios.isCancel(requestError)) setError(errorMessage(requestError));
        } finally {
          if (!controller.signal.aborted) setLoading(false);
        }
      };

      void loadClients();
    }, 220);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [search, filterValues, pagination.page, pagination.pageSize, refreshKey]);

  const changeSearch = (value: string) => {
    setSearch(value);
    setPagination((current) => ({ ...current, page: 1 }));
  };

  const changeFilter = (key: string, value: string) => {
    setFilterValues((current) => ({ ...current, [key]: value }));
    setPagination((current) => ({ ...current, page: 1 }));
  };

  const updateClientStatus = async (client: ClientRecord) => {
    setRowActionError(null);
    try {
      await apiClient.patch<ClientResponse>(`/tenant/clients/${client.id}`, {
        status: client.status === 'ARCHIVED' ? 'ACTIVE' : 'ARCHIVED',
      });
      setRefreshKey((current) => current + 1);
    } catch (requestError) {
      setRowActionError(errorMessage(requestError));
    }
  };

  return (
    <div className="clients-page">
      <div className="clients-page-heading">
        <div>
          <span className="studio-eyebrow"><UsersRound size={13} /> YOUR CLIENT RELATIONSHIPS</span>
          <h1>Manage clients</h1>
          <p>Keep client details organized and connected to the work you make together.</p>
        </div>
        <Link className="clients-create-button" to="/dashboard/clients/new">
          <Plus size={16} /> Create client
        </Link>
      </div>
      {rowActionError && <p className="client-create-error" role="alert">{rowActionError}</p>}

      <ListView
        title="Clients"
        rows={clients}
        rowKey={(client) => client.id}
        columns={clientColumns}
        filters={clientFilters}
        dateFilters={clientDateFilters}
        search={search}
        onSearchChange={changeSearch}
        filterValues={filterValues}
        onFilterChange={changeFilter}
        pagination={pagination}
        onPageChange={(page) => setPagination((current) => ({ ...current, page }))}
        loading={loading}
        error={error}
        rowActions={(client) => (
          <div className="client-row-actions">
            <Link to={`/dashboard/clients/${client.id}/edit`}>Edit</Link>
            <button type="button" onClick={() => void updateClientStatus(client)}>
              {client.status === 'ARCHIVED' ? 'Restore' : 'Archive'}
            </button>
          </div>
        )}
        emptyTitle="No clients yet"
        emptyDescription="Create your first client to start building your studio workspace."
      />

    </div>
  );
};
