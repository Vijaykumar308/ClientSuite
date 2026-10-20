import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import axios from 'axios';
import { ArrowLeft, FolderKanban } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { apiClient } from '../../../api/client';
import type { ProjectClientOption } from './projectFields';
import './projects.css';

interface ClientListResponse {
  success: boolean;
  data: ProjectClientOption[];
  pagination: { page: number; pageSize: number; total: number; pageCount: number };
}

const errorMessage = (error: unknown): string => {
  if (axios.isAxiosError<{ error?: { message?: string } }>(error)) {
    return error.response?.data?.error?.message ?? 'Unable to connect to the server.';
  }
  if (error instanceof Error) return error.message;
  return 'Unable to save this project. Please try again.';
};

const isClientListResponse = (value: unknown): value is ClientListResponse => {
  if (!value || typeof value !== 'object') return false;
  const response = value as Partial<ClientListResponse>;
  return response.success === true && Array.isArray(response.data) && Boolean(response.pagination);
};

export const ProjectFormPage = () => {
  const navigate = useNavigate();
  const [projectName, setProjectName] = useState('');
  const [clientId, setClientId] = useState('');
  const [selectedClientName, setSelectedClientName] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [clientOptions, setClientOptions] = useState<ProjectClientOption[]>([]);
  const [clientPickerOpen, setClientPickerOpen] = useState(false);
  const [clientOptionsLoading, setClientOptionsLoading] = useState(false);
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [price, setPrice] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clientPickerOpen) return undefined;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      const loadClientOptions = async () => {
        setClientOptionsLoading(true);
        setError(null);
        try {
          const params = new URLSearchParams({ pageSize: '100' });
          if (clientSearch.trim()) params.set('search', clientSearch.trim());
          const response = await apiClient.get<ClientListResponse>(`/tenant/clients?${params.toString()}`, {
            signal: controller.signal,
          });
          if (!isClientListResponse(response.data)) {
            throw new Error('The server returned an invalid client list response.');
          }
          setClientOptions(response.data.data.filter((client) => client.status !== 'ARCHIVED'));
        } catch (requestError) {
          if (!axios.isCancel(requestError)) setError(errorMessage(requestError));
        } finally {
          if (!controller.signal.aborted) setClientOptionsLoading(false);
        }
      };
      void loadClientOptions();
    }, 180);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [clientPickerOpen, clientSearch]);

  const saveProject = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiClient.post('/tenant/projects', {
        name: projectName,
        clientId,
        description: description || null,
        dueDate: dueDate || null,
        price: price || null,
      });
      navigate('/dashboard/projects', { replace: true });
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="project-form-page">
      <Link className="client-form-back-link" to="/dashboard/projects">
        <ArrowLeft size={14} /> Back to projects
      </Link>
      <div className="project-form-heading">
        <span className="studio-eyebrow"><FolderKanban size={13} /> PROJECT DETAILS</span>
        <h1>Create project</h1>
        <p>Choose a client and add the details you have so far.</p>
      </div>
      <form className="client-create-form client-form-card" onSubmit={(event) => void saveProject(event)}>
        <label>
          <span>Project name</span>
          <input
            maxLength={120}
            onChange={(event) => setProjectName(event.target.value)}
            required
            value={projectName}
          />
        </label>
        <label className="project-client-field">
          <span>Client</span>
          <input
            autoComplete="off"
            onChange={(event) => {
              setClientSearch(event.target.value);
              setSelectedClientName('');
              setClientId('');
              setClientPickerOpen(true);
            }}
            onFocus={() => setClientPickerOpen(true)}
            placeholder="Search your clients"
            required={!clientId}
            role="combobox"
            aria-expanded={clientPickerOpen}
            aria-controls="project-client-options"
            value={clientPickerOpen ? clientSearch : selectedClientName}
          />
          {clientPickerOpen && (
            <ul className="project-client-options" id="project-client-options" role="listbox">
              {clientOptionsLoading && <li className="project-client-option-message">Searching clients…</li>}
              {!clientOptionsLoading && clientOptions.map((client) => (
                <li key={client.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={clientId === client.id}
                    onClick={() => {
                      setClientId(client.id);
                      setSelectedClientName(client.name);
                      setClientSearch('');
                      setClientPickerOpen(false);
                    }}
                  >
                    <strong>{client.name}</strong><span>{client.email}</span>
                  </button>
                </li>
              ))}
              {!clientOptionsLoading && clientOptions.length === 0 && (
                <li className="project-client-option-message">
                  No active clients found. <Link to="/dashboard/clients/new">Create a client</Link>
                </li>
              )}
            </ul>
          )}
        </label>
        <label>
          <span>Description <small>Optional</small></span>
          <textarea maxLength={5000} onChange={(event) => setDescription(event.target.value)} rows={4} value={description} />
        </label>
        <div className="project-optional-fields">
          <label>
            <span>Deadline <small>Optional</small></span>
            <input type="date" onChange={(event) => setDueDate(event.target.value)} value={dueDate} />
          </label>
          <label>
            <span>Project price <small>Optional</small></span>
            <input
              min="0"
              max="99999999.99"
              step="0.01"
              type="number"
              onChange={(event) => setPrice(event.target.value)}
              value={price}
            />
          </label>
        </div>
        {error && <p className="client-create-error" role="alert">{error}</p>}
        <div className="client-form-actions">
          <Link className="client-cancel-button" to="/dashboard/projects">Cancel</Link>
          <button className="clients-create-button" type="submit" disabled={saving || !clientId}>
            {saving ? 'Creating…' : 'Create project'}
          </button>
        </div>
      </form>
    </section>
  );
};
