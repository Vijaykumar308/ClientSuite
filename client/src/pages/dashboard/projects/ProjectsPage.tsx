import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { FolderKanban, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../../api/client';
import { ListView, type ListViewPagination } from '../../../components/list-view/ListView';
import {
  createProjectColumns,
  createProjectFilters,
  projectDateFilters,
  type ProjectClientOption,
  type ProjectRecord,
} from './projectFields';
import './projects.css';

interface ProjectListResponse {
  success: boolean;
  data: ProjectRecord[];
  pagination: ListViewPagination;
}

interface ClientListResponse {
  success: boolean;
  data: ProjectClientOption[];
  pagination: ListViewPagination;
}

const initialPagination: ListViewPagination = { page: 1, pageSize: 20, total: 0, pageCount: 0 };

const errorMessage = (error: unknown): string => {
  if (axios.isAxiosError<{ error?: { message?: string } }>(error)) {
    return error.response?.data?.error?.message ?? 'Unable to connect to the server.';
  }
  if (error instanceof Error) return error.message;
  return 'Unable to load projects. Please try again.';
};

const isProjectListResponse = (value: unknown): value is ProjectListResponse => {
  if (!value || typeof value !== 'object') return false;
  const response = value as Partial<ProjectListResponse>;
  return response.success === true && Array.isArray(response.data) && Boolean(response.pagination);
};

const isClientListResponse = (value: unknown): value is ClientListResponse => {
  if (!value || typeof value !== 'object') return false;
  const response = value as Partial<ClientListResponse>;
  return response.success === true && Array.isArray(response.data) && Boolean(response.pagination);
};

const formatApiDate = (date: string, endOfDay = false): string => {
  const value = new Date(`${date}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}`);
  return value.toISOString();
};

export const ProjectsPage = () => {
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [clients, setClients] = useState<ProjectClientOption[]>([]);
  const [pagination, setPagination] = useState(initialPagination);
  const [search, setSearch] = useState('');
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const columns = useMemo(() => createProjectColumns(), []);
  const filters = useMemo(() => createProjectFilters(clients), [clients]);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      const loadProjects = async () => {
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
          const response = await apiClient.get<ProjectListResponse>(`/tenant/projects?${params.toString()}`, {
            signal: controller.signal,
          });
          if (!isProjectListResponse(response.data)) {
            throw new Error('The server returned an invalid project list response. Restart the API server and try again.');
          }
          setProjects(response.data.data);
          setPagination(response.data.pagination);
        } catch (requestError) {
          if (!axios.isCancel(requestError)) setError(errorMessage(requestError));
        } finally {
          if (!controller.signal.aborted) setLoading(false);
        }
      };
      void loadProjects();
    }, 220);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [search, filterValues, pagination.page, pagination.pageSize]);

  useEffect(() => {
    const controller = new AbortController();
    const loadClients = async () => {
      try {
        const response = await apiClient.get<ClientListResponse>('/tenant/clients?pageSize=100', {
          signal: controller.signal,
        });
        if (!isClientListResponse(response.data)) {
          throw new Error('The server returned an invalid client list response.');
        }
        setClients(response.data.data);
      } catch (requestError) {
        if (!axios.isCancel(requestError)) setError(errorMessage(requestError));
      }
    };
    void loadClients();
    return () => controller.abort();
  }, []);

  const changeSearch = (value: string) => {
    setSearch(value);
    setPagination((current) => ({ ...current, page: 1 }));
  };

  const changeFilter = (key: string, value: string) => {
    setFilterValues((current) => ({ ...current, [key]: value }));
    setPagination((current) => ({ ...current, page: 1 }));
  };

  return (
    <div className="projects-page">
      <div className="projects-page-heading">
        <div>
          <span className="studio-eyebrow"><FolderKanban size={13} /> YOUR STUDIO WORK</span>
          <h1>Projects</h1>
          <p>Organize each project and keep it connected to the right client.</p>
        </div>
        <Link className="clients-create-button" to="/dashboard/projects/new">
          <Plus size={16} /> Create project
        </Link>
      </div>

      <ListView
        title="Projects"
        rows={projects}
        rowKey={(project) => project.id}
        columns={columns}
        filters={filters}
        dateFilters={projectDateFilters}
        search={search}
        onSearchChange={changeSearch}
        filterValues={filterValues}
        onFilterChange={changeFilter}
        pagination={pagination}
        onPageChange={(page) => setPagination((current) => ({ ...current, page }))}
        loading={loading}
        error={error}
        emptyTitle="No projects yet"
        emptyDescription="Create a project and associate it with one of your clients."
      />
    </div>
  );
};
