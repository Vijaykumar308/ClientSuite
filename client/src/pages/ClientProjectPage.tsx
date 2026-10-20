import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Headphones, Music2 } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { apiClient } from '../api/client';
import './client-project.css';

interface SharedTrack {
  id: string;
  title: string;
  version: {
    fileName: string;
    durationSeconds: number;
  };
}

interface SharedProjectResponse {
  success: boolean;
  data: {
    project: { name: string };
    tracks: SharedTrack[];
    previewWindowSeconds: number;
  };
}

const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError<{ error?: { message?: string } }>(error)) {
    return error.response?.data?.error?.message ?? 'Unable to connect to the server.';
  }
  if (error instanceof Error) return error.message;
  return 'Unable to load this project. Please try again.';
};

const formatTime = (seconds: number): string => {
  const totalSeconds = Math.max(0, Math.floor(seconds));
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}`;
};

const PreviewTrack = ({
  token,
  track,
  previewWindowSeconds,
}: {
  token: string;
  track: SharedTrack;
  previewWindowSeconds: number;
}) => {
  const duration = Math.max(0, track.version.durationSeconds);
  const maxStart = Math.max(0, Math.floor(duration) - previewWindowSeconds);
  const [start, setStart] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const audioRef = useRef<HTMLAudioElement>(null);
  const resumeAfterSeekRef = useRef(false);
  const windowWidth = duration > 0
    ? Math.min(100, (Math.min(duration, previewWindowSeconds) / duration) * 100)
    : 100;
  const windowPosition = maxStart > 0 ? (start / maxStart) * (100 - windowWidth) : 0;

  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setPreviewUrl(null);
    const timeout = window.setTimeout(() => {
      void apiClient.get<Blob>(`/client-portal/${token}/tracks/${track.id}/preview`, {
        params: { start },
        responseType: 'blob',
        signal: controller.signal,
        timeout: 90_000,
      }).then((response) => {
        const nextUrl = URL.createObjectURL(response.data);
        if (!controller.signal.aborted) setPreviewUrl(nextUrl);
        else URL.revokeObjectURL(nextUrl);
      }).catch(async (requestError: unknown) => {
        if (axios.isCancel(requestError)) return;
        if (axios.isAxiosError<Blob>(requestError) && requestError.response?.data instanceof Blob) {
          try {
            const payload = JSON.parse(await requestError.response.data.text()) as { error?: { message?: string } };
            setError(payload.error?.message ?? getErrorMessage(requestError));
          } catch {
            setError(getErrorMessage(requestError));
          }
          return;
        }
        setError(getErrorMessage(requestError));
      }).finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    }, 250);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [start, token, track.id]);

  useEffect(() => {
    if (previewUrl && (playing || resumeAfterSeekRef.current) && audioRef.current) {
      void audioRef.current.play().then(() => {
        resumeAfterSeekRef.current = false;
      }).catch(() => {
        resumeAfterSeekRef.current = false;
        setPlaying(false);
      });
    }
  }, [previewUrl, playing]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [previewUrl, volume]);

  return (
    <article className="client-preview-track">
      <div className="client-preview-track-title">
        <span className="client-preview-icon"><Music2 size={16} /></span>
        <div>
          <h2>{track.title}</h2>
          <p>{track.version.fileName} · {formatTime(duration)}</p>
        </div>
      </div>
      <div className="client-preview-window">
        <div className="client-preview-time-labels">
          <span>Start {formatTime(start)}</span>
          <span>Window {formatTime(Math.min(previewWindowSeconds, duration))}</span>
          <span>End {formatTime(Math.min(start + previewWindowSeconds, duration))}</span>
        </div>
        <div className="client-preview-timeline">
          <span
            className="client-preview-window-indicator"
            style={{ left: `${windowPosition}%`, width: `${windowWidth}%` }}
            aria-hidden="true"
          />
          <input
            aria-label={`Move the ${previewWindowSeconds}-second preview window for ${track.title}`}
            type="range"
            min={0}
            max={maxStart}
            step={1}
            value={start}
            disabled={maxStart === 0}
            onChange={(event) => {
              resumeAfterSeekRef.current = true;
              setPlaying(false);
              setPreviewUrl(null);
              setStart(Number(event.currentTarget.value));
            }}
          />
        </div>
        <p className="client-preview-hint">
          {maxStart === 0
            ? 'This track is shorter than the preview window and will play in full.'
            : 'Drag the highlighted window to listen to any portion of the track.'}
        </p>
      </div>
      <div className="client-preview-player">
        {loading ? (
          <p role="status">Preparing this preview…</p>
        ) : error ? (
          <p className="client-preview-error" role="alert">{error}</p>
        ) : previewUrl ? (
          <audio
            ref={audioRef}
            controls
            controlsList="nodownload"
            preload="metadata"
            src={previewUrl}
            onVolumeChange={(event) => setVolume(event.currentTarget.volume)}
            onPlay={() => {
              resumeAfterSeekRef.current = false;
              setPlaying(true);
            }}
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
            aria-label={`Play ${track.title} preview`}
          />
        ) : (
          <p className="client-preview-error" role="alert">Preview unavailable.</p>
        )}
      </div>
    </article>
  );
};

export const ClientProjectPage = () => {
  const { token = '' } = useParams();
  const [projectName, setProjectName] = useState('');
  const [tracks, setTracks] = useState<SharedTrack[]>([]);
  const [previewWindowSeconds, setPreviewWindowSeconds] = useState(20);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void apiClient.get<SharedProjectResponse>(`/client-portal/${token}`, {
      signal: controller.signal,
    }).then((response) => {
      if (
        response.data.success !== true
        || typeof response.data.data?.project?.name !== 'string'
        || !Array.isArray(response.data.data.tracks)
        || !Number.isInteger(response.data.data.previewWindowSeconds)
      ) {
        throw new Error('The server returned an invalid project preview.');
      }
      setProjectName(response.data.data.project.name);
      setTracks(response.data.data.tracks);
      setPreviewWindowSeconds(response.data.data.previewWindowSeconds);
    }).catch((requestError: unknown) => {
      if (axios.isCancel(requestError)) return;
      setError(getErrorMessage(requestError));
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [token]);

  return (
    <main className="client-project-page">
      <header className="client-project-header">
        <a className="client-project-brand" href="/">
          <span><Music2 size={17} /></span>
          ClientSuite <i>Music</i>
        </a>
        <span className="client-project-private"><Headphones size={14} /> Private project preview</span>
      </header>
      <section className="client-project-content">
        <span className="client-project-eyebrow">A PROJECT FOR YOU</span>
        {loading ? (
          <p className="client-project-status" role="status">Loading your project…</p>
        ) : error ? (
          <div className="client-project-unavailable" role="alert">
            <h1>Project link unavailable</h1>
            <p>{error}</p>
          </div>
        ) : (
          <>
            <h1>{projectName}</h1>
            <p className="client-project-intro">
              Listen through the project in focused {previewWindowSeconds}-second windows.
              Drag the highlighted section to hear a different part.
            </p>
            {tracks.length === 0 ? (
              <div className="client-project-empty">No audio files are available to preview yet.</div>
            ) : (
              <div className="client-preview-tracks">
                {tracks.map((track) => (
                  <PreviewTrack
                    key={track.id}
                    token={token}
                    track={track}
                    previewWindowSeconds={previewWindowSeconds}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </section>
      <footer className="client-project-footer">Shared privately by your music director.</footer>
    </main>
  );
};
