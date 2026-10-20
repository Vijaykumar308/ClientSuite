import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import axios from 'axios';
import { ArrowLeft, UsersRound } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { apiClient } from '../../../api/client';
import type { ClientRecord } from './clientFields';
import './clients.css';

interface ClientResponse {
  success: boolean;
  data: ClientRecord;
}

interface ClientFormValues {
  name: string;
  email: string;
  phone: string;
  notes: string;
}

const emptyForm: ClientFormValues = { name: '', email: '', phone: '', notes: '' };

const errorMessage = (error: unknown): string => {
  if (axios.isAxiosError<{ error?: { message?: string } }>(error)) {
    return error.response?.data?.error?.message ?? 'Unable to connect to the server.';
  }
  if (error instanceof Error) return error.message;
  return 'Unable to save this client. Please try again.';
};

const isClientResponse = (value: unknown): value is ClientResponse => {
  if (!value || typeof value !== 'object') return false;
  const response = value as Partial<ClientResponse>;
  return response.success === true && Boolean(response.data?.id);
};

interface ClientFormPageProps {
  clientId?: string;
}

export const ClientFormPage = ({ clientId }: ClientFormPageProps) => {
  const navigate = useNavigate();
  const [values, setValues] = useState(emptyForm);
  const [loading, setLoading] = useState(Boolean(clientId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId) return undefined;
    const controller = new AbortController();
    const loadClient = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiClient.get<ClientResponse>(`/tenant/clients/${clientId}`, {
          signal: controller.signal,
        });
        if (!isClientResponse(response.data)) {
          throw new Error('The server returned an invalid client response.');
        }
        const client = response.data.data;
        setValues({
          name: client.name,
          email: client.email,
          phone: client.phone ?? '',
          notes: client.notes ?? '',
        });
      } catch (requestError) {
        if (!axios.isCancel(requestError)) setError(errorMessage(requestError));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void loadClient();
    return () => controller.abort();
  }, [clientId]);

  const saveClient = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: values.name,
        email: values.email,
        phone: values.phone || null,
        notes: values.notes || null,
      };
      if (clientId) {
        await apiClient.patch(`/tenant/clients/${clientId}`, payload);
      } else {
        await apiClient.post('/tenant/clients', payload);
      }
      navigate('/dashboard/clients', { replace: true });
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  const isEditing = Boolean(clientId);

  return (
    <section className="client-form-page">
      <Link className="client-form-back-link" to="/dashboard/clients">
        <ArrowLeft size={14} /> Back to clients
      </Link>
      <div className="client-form-heading">
        <span className="studio-eyebrow"><UsersRound size={13} /> CLIENT DETAILS</span>
        <h1>{isEditing ? 'Edit client' : 'Create client'}</h1>
        <p>Keep the contact details and internal notes for this client up to date.</p>
      </div>
      {loading ? (
        <p className="client-form-message">Loading client details…</p>
      ) : isEditing && error && !values.name ? (
        <p className="client-form-message" role="alert">{error}</p>
      ) : (
        <form className="client-create-form client-form-card" onSubmit={(event) => void saveClient(event)}>
          <label>
            <span>Full name</span>
            <input
              autoComplete="name"
              maxLength={120}
              onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
              placeholder="Full name"
              required
              value={values.name}
            />
          </label>
          <label>
            <span>Email address</span>
            <input
              autoComplete="email"
              maxLength={254}
              onChange={(event) => setValues((current) => ({ ...current, email: event.target.value }))}
              placeholder="client@example.com"
              required
              type="email"
              value={values.email}
            />
          </label>
          <label>
            <span>Phone number <small>Optional</small></span>
            <input
              autoComplete="tel"
              maxLength={40}
              onChange={(event) => setValues((current) => ({ ...current, phone: event.target.value }))}
              placeholder="Phone number"
              type="tel"
              value={values.phone}
            />
          </label>
          <label>
            <span>Internal notes <small>Optional</small></span>
            <textarea
              maxLength={5000}
              onChange={(event) => setValues((current) => ({ ...current, notes: event.target.value }))}
              placeholder="Notes visible only to your studio"
              rows={4}
              value={values.notes}
            />
          </label>
          {error && <p className="client-create-error" role="alert">{error}</p>}
          <div className="client-form-actions">
            <Link className="client-cancel-button" to="/dashboard/clients">Cancel</Link>
            <button className="clients-create-button" type="submit" disabled={saving}>
              {saving ? 'Saving…' : isEditing ? 'Save changes' : 'Create client'}
            </button>
          </div>
        </form>
      )}
    </section>
  );
};
