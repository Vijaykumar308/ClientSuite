import { useEffect, useState } from 'react';
import axios from 'axios';
import { ArrowLeft, CalendarDays, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../../api/client';
import type { ProjectRecord } from './projectFields';
import './projects.css';

interface ProjectResponse {
  success: boolean;
  data: ProjectRecord;
}

const errorMessage = (error: unknown): string => {
  if (axios.isAxiosError<{ error?: { message?: string } }>(error)) {
    return error.response?.data?.error?.message ?? 'Unable to connect to the server.';
  }
  if (error instanceof Error) return error.message;
  return 'Unable to load this project. Please try again.';
};

export const ProjectDetailsPage = ({ projectId }: { projectId: string }) => {
  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const loadProject = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiClient.get<ProjectResponse>(`/tenant/projects/${projectId}`, {
          signal: controller.signal,
        });
        if (response.data.success !== true || !response.data.data?.id) {
          throw new Error('The server returned an invalid project response.');
        }
        setProject(response.data.data);
      } catch (requestError) {
        if (!axios.isCancel(requestError)) setError(errorMessage(requestError));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void loadProject();
    return () => controller.abort();
  }, [projectId]);

  if (loading) return <div className="project-details-status">Loading project…</div>;
  if (error) return <div className="project-details-status project-details-error" role="alert">{error}</div>;
  if (!project) return <div className="project-details-status">Project not found.</div>;

  return (
    <section className="project-details-page">
      <Link className="project-back-link" to="/dashboard/projects"><ArrowLeft size={15} /> Back to projects</Link>
      <div className="project-details-heading">
        <div>
          <span className="studio-eyebrow">PROJECT DETAILS</span>
          <h1>{project.name}</h1>
          <span className="client-status-badge">{project.status.toLowerCase().replace(/_/g, ' ')}</span>
        </div>
      </div>
      <div className="project-details-card">
        <div className="project-details-client">
          <UserRound size={18} />
          <div><span>Client</span><strong>{project.client.name}</strong><a href={`mailto:${project.client.email}`}>{project.client.email}</a></div>
        </div>
        <dl className="project-details-grid">
          <div><dt>Deadline</dt><dd>{project.dueDate ? new Date(project.dueDate).toLocaleDateString() : 'Not set'}</dd></div>
          <div><dt>Project price</dt><dd>{new Intl.NumberFormat(undefined, {
            style: 'currency',
            currency: project.currency,
          }).format(Number(project.price))}</dd></div>
          <div><dt>Created</dt><dd>{new Date(project.createdAt).toLocaleDateString()}</dd></div>
          <div><dt>Last modified</dt><dd>{new Date(project.updatedAt).toLocaleDateString()}</dd></div>
        </dl>
        <div className="project-details-description">
          <h2><CalendarDays size={15} /> Description</h2>
          <p>{project.description || 'No description has been added.'}</p>
        </div>
      </div>
    </section>
  );
};
