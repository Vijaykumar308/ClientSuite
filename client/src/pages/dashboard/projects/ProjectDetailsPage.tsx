import { ChangeEvent, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { ArrowLeft, CalendarDays, Copy, Link2, Link2Off, Music2, Trash2, Upload, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../../api/client';
import type { ProjectRecord } from './projectFields';
import './projects.css';

interface ProjectResponse {
  success: boolean;
  data: ProjectRecord & { portalEnabled: boolean; portalToken: string };
}

interface AudioVersion {
  id: string;
  versionNumber: number;
  fileName: string;
  durationSeconds: number | null;
  fileSizeBytes: string | null;
  mimeType: string | null;
  status: string;
  isActiveVersion: boolean;
  createdAt: string;
}

interface AudioTrack {
  id: string;
  title: string;
  versions: AudioVersion[];
}

interface AudioTracksResponse {
  success: boolean;
  maxFileSizeBytes: number;
  data: AudioTrack[];
}

interface AudioTrackResponse {
  success: boolean;
  data: AudioTrack | AudioVersion;
}

interface ShareLinkResponse {
  success: boolean;
  data: { token: string };
}

interface UploadProgress {
  name: string;
  progress: number;
}

const errorMessage = (error: unknown): string => {
  if (axios.isAxiosError<{ error?: { message?: string } }>(error)) {
    return error.response?.data?.error?.message ?? 'Unable to connect to the server.';
  }
  if (error instanceof Error) return error.message;
  return 'Unable to load this project. Please try again.';
};

const audioErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError<{ error?: { message?: string } }>(error)) {
    return error.response?.data?.error?.message ?? 'Unable to complete the audio file request.';
  }
  if (error instanceof Error) return error.message;
  return 'Unable to complete the audio file request.';
};

const formatFileSize = (size: string | null): string => {
  if (!size) return 'Unknown size';
  const bytes = Number(size);
  if (!Number.isFinite(bytes) || bytes < 0) return 'Unknown size';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDuration = (seconds: number | null): string => {
  if (seconds === null || !Number.isFinite(seconds) || seconds <= 0) return 'Duration unavailable';
  const totalSeconds = Math.floor(seconds);
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}`;
};

const audioTrackPath = (projectId: string) => `/tenant/projects/${projectId}/audio-tracks`;

export const ProjectDetailsPage = ({ projectId }: { projectId: string }) => {
  const [project, setProject] = useState<ProjectResponse['data'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [audioTracks, setAudioTracks] = useState<AudioTrack[]>([]);
  const [audioLoading, setAudioLoading] = useState(true);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [audioNotice, setAudioNotice] = useState<string | null>(null);
  const [shareNotice, setShareNotice] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [maxFileSizeBytes, setMaxFileSizeBytes] = useState<number | null>(null);
  const versionInputs = useRef<Record<string, HTMLInputElement | null>>({});

  const loadAudioTracks = async (signal?: AbortSignal, clearError = true) => {
    setAudioLoading(true);
    if (clearError) setAudioError(null);
    try {
      const response = await apiClient.get<AudioTracksResponse>(audioTrackPath(projectId), { signal });
      if (
        response.data.success !== true
        || !Array.isArray(response.data.data)
        || !Number.isFinite(response.data.maxFileSizeBytes)
      ) {
        throw new Error('The server returned an invalid audio files response.');
      }
      setAudioTracks(response.data.data);
      setMaxFileSizeBytes(response.data.maxFileSizeBytes);
    } catch (requestError) {
      if (!axios.isCancel(requestError)) setAudioError(audioErrorMessage(requestError));
    } finally {
      if (!signal?.aborted) setAudioLoading(false);
    }
  };

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

  useEffect(() => {
    const controller = new AbortController();
    void loadAudioTracks(controller.signal);
    return () => controller.abort();
  }, [projectId]);

  const uploadFiles = async (files: File[], trackId?: string) => {
    setAudioNotice(null);
    setAudioError(null);
    const progressItems = files.map((file) => ({ name: file.name, progress: 0 }));
    setUploadProgress(progressItems);
    try {
      for (const [index, file] of files.entries()) {
        if (maxFileSizeBytes !== null && file.size > maxFileSizeBytes) {
          throw new Error(`${file.name} exceeds the ${formatFileSize(String(maxFileSizeBytes))} upload limit.`);
        }
        const formData = new FormData();
        formData.append('audio', file);
        const response = await apiClient.post<AudioTrackResponse>(
          trackId ? `${audioTrackPath(projectId)}/${trackId}/versions` : audioTrackPath(projectId),
          formData,
          {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 10 * 60 * 1000,
            onUploadProgress: (event) => {
              const progress = event.total ? Math.round((event.loaded / event.total) * 100) : 0;
              setUploadProgress((current) => current.map((item, itemIndex) => (
                itemIndex === index ? { ...item, progress } : item
              )));
            },
          }
        );
        if (response.data.success !== true) {
          throw new Error(`The server did not confirm the upload of ${file.name}.`);
        }
      }
      setAudioNotice(files.length === 1 ? 'Audio file uploaded.' : `${files.length} audio files uploaded.`);
      await loadAudioTracks();
    } catch (uploadError) {
      const message = audioErrorMessage(uploadError);
      await loadAudioTracks(undefined, false);
      setAudioError(message);
    } finally {
      setUploadProgress([]);
    }
  };

  const handleNewAudioFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = '';
    if (files.length) void uploadFiles(files);
  };

  const handleVersionFile = (trackId: string) => (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (file) void uploadFiles([file], trackId);
  };

  const deleteVersion = async (track: AudioTrack, version: AudioVersion) => {
    if (!window.confirm(`Delete "${version.fileName}" (version ${version.versionNumber})?`)) return;
    setAudioNotice(null);
    setAudioError(null);
    try {
      await apiClient.delete(
        `${audioTrackPath(projectId)}/${track.id}/versions/${version.id}`
      );
      setAudioNotice(`Version ${version.versionNumber} deleted.`);
      await loadAudioTracks();
    } catch (deleteError) {
      setAudioError(audioErrorMessage(deleteError));
    }
  };

  const createShareLink = async () => {
    setShareNotice(null);
    setAudioError(null);
    try {
      const response = await apiClient.post<ShareLinkResponse>(`/tenant/projects/${projectId}/share-link`);
      if (response.data.success !== true || !response.data.data?.token) {
        throw new Error('The server did not confirm the project link.');
      }
      setProject((current) => current
        ? { ...current, portalEnabled: true, portalToken: response.data.data.token }
        : current);
      setShareNotice('Client link is ready. Anyone with the link can listen to the project previews.');
    } catch (requestError) {
      setShareNotice(audioErrorMessage(requestError));
    }
  };

  const revokeShareLink = async () => {
    if (!window.confirm('Revoke this client link? Anyone using it will lose access immediately.')) return;
    setShareNotice(null);
    try {
      await apiClient.delete(`/tenant/projects/${projectId}/share-link`);
      setProject((current) => current ? { ...current, portalEnabled: false } : current);
      setShareNotice('The client link has been revoked.');
    } catch (requestError) {
      setShareNotice(audioErrorMessage(requestError));
    }
  };

  const copyShareLink = async () => {
    if (!project?.portalEnabled) return;
    const link = `${window.location.origin}/share/${project.portalToken}`;
    try {
      await navigator.clipboard.writeText(link);
      setShareNotice('Client link copied to clipboard.');
    } catch {
      setShareNotice('Could not copy the client link. Copy it from the address shown below.');
    }
  };

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
      <section className="project-audio-section" aria-labelledby="project-audio-heading">
        <div className="project-share-panel">
          <div>
            <strong>Client preview link</strong>
            <p>Clients can listen to movable 20-second previews. Original audio stays private.</p>
            {project.portalEnabled && (
              <code>{`${window.location.origin}/share/${project.portalToken}`}</code>
            )}
            {shareNotice && <span className="project-share-notice" role="status">{shareNotice}</span>}
          </div>
          <div className="project-share-actions">
            {project.portalEnabled ? (
              <>
                <button type="button" className="project-audio-secondary-button" onClick={() => void copyShareLink()}>
                  <Copy size={13} /> Copy link
                </button>
                <button type="button" className="project-audio-secondary-button" onClick={() => void createShareLink()}>
                  <Link2 size={13} /> Regenerate
                </button>
                <button type="button" className="project-share-revoke-button" onClick={() => void revokeShareLink()}>
                  <Link2Off size={13} /> Revoke
                </button>
              </>
            ) : (
              <button type="button" className="project-audio-secondary-button" onClick={() => void createShareLink()}>
                <Link2 size={13} /> Create client link
              </button>
            )}
          </div>
        </div>
        <div className="project-audio-heading">
          <div>
            <h2 id="project-audio-heading"><Music2 size={16} /> Project files</h2>
            <p>Upload and manage private MP3 and WAV files for this project.</p>
          </div>
          <label className="project-audio-upload-button">
            <Upload size={14} /> Upload audio
            <input
              type="file"
              accept=".mp3,.wav,audio/mpeg,audio/wav"
              multiple
              onChange={handleNewAudioFiles}
              disabled={uploadProgress.length > 0}
            />
          </label>
        </div>
        {maxFileSizeBytes !== null && (
          <p className="project-audio-limit">MP3 or WAV · Up to {formatFileSize(String(maxFileSizeBytes))} per file</p>
        )}
        {audioError && <p className="project-audio-message project-audio-error" role="alert">{audioError}</p>}
        {audioNotice && <p className="project-audio-message" role="status">{audioNotice}</p>}
        {uploadProgress.length > 0 && (
          <div className="project-audio-uploads" aria-live="polite">
            {uploadProgress.map((upload) => (
              <div className="project-audio-upload-progress" key={upload.name}>
                <span>{upload.name}</span>
                <progress value={upload.progress} max={100}>{upload.progress}%</progress>
                <small>{upload.progress}%</small>
              </div>
            ))}
          </div>
        )}
        {audioLoading ? (
          <p className="project-audio-empty">Loading audio files…</p>
        ) : audioTracks.length === 0 ? (
          <p className="project-audio-empty">No audio files have been uploaded to this project.</p>
        ) : (
          <div className="project-audio-tracks">
            {audioTracks.map((track) => (
              <article className="project-audio-track" key={track.id}>
                <div className="project-audio-track-heading">
                  <h3>{track.title}</h3>
                  <div>
                    <input
                      ref={(input) => { versionInputs.current[track.id] = input; }}
                      type="file"
                      accept=".mp3,.wav,audio/mpeg,audio/wav"
                      className="project-audio-hidden-input"
                      onChange={handleVersionFile(track.id)}
                    />
                    <button
                      type="button"
                      className="project-audio-secondary-button"
                      onClick={() => versionInputs.current[track.id]?.click()}
                      disabled={uploadProgress.length > 0}
                    >
                      <Upload size={13} /> Upload new version
                    </button>
                  </div>
                </div>
                {track.versions.map((version) => (
                  <div className="project-audio-version" key={version.id}>
                    <div className="project-audio-version-details">
                      <strong>{version.fileName}</strong>
                      <span>
                        v{version.versionNumber}
                        {version.isActiveVersion ? ' · Current' : ''}
                        {' · '}{formatDuration(version.durationSeconds)}
                        {' · '}{formatFileSize(version.fileSizeBytes)}
                        {' · '}{new Date(version.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="project-audio-version-actions">
                      {version.status === 'READY' ? (
                        <audio
                          controls
                          preload="none"
                          src={`${audioTrackPath(projectId)}/${track.id}/versions/${version.id}/stream`}
                          aria-label={`Play ${version.fileName}`}
                        />
                      ) : <span className="project-audio-unavailable">{version.status.toLowerCase()}</span>}
                      <button
                        type="button"
                        className="project-audio-delete-button"
                        onClick={() => void deleteVersion(track, version)}
                        aria-label={`Delete ${version.fileName}`}
                        title={`Delete ${version.fileName}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
};
