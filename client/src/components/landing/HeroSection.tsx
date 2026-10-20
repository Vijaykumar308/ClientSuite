import {
  ArrowDown,
  ArrowUpRight,
  Check,
  Clock3,
  Headphones,
  MoreHorizontal,
  Play,
  Plus,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const waveform = [
  18, 26, 14, 35, 53, 30, 68, 42, 24, 48, 76, 36, 56, 29, 70, 44, 25, 62,
  38, 78, 47, 28, 56, 34, 72, 45, 23, 52, 31, 64, 40, 75, 34, 58, 22, 47,
  68, 38, 54, 25, 70, 43, 30, 60, 36, 76, 48, 27, 57, 33, 67, 42, 22, 52,
  35, 72, 45, 26, 61, 38, 77, 49, 28, 58, 34, 69, 41, 23, 55, 36, 73, 46,
];

export const HeroSection = () => (
  <section className="hero-section" id="top">
    <div className="hero-copy">
      <div className="hero-kicker">
        <span className="kicker-dot" />
        THE CREATIVE BUSINESS, IN HARMONY
      </div>
      <h1>
        Make room for
        <br />
        <span>the music.</span>
      </h1>
      <p className="hero-description">
        The all-in-one workspace for music directors to manage clients, share
        previews, gather feedback, and deliver the final track.
      </p>
      <div className="hero-actions">
        <Link className="button button-primary" to="/signup">
          Start your free trial <ArrowUpRight size={16} />
        </Link>
        <a className="text-link" href="#workflow">
          See how it works <ArrowDown size={15} />
        </a>
      </div>
      <div className="hero-proof">
        <div className="proof-avatars" aria-hidden="true">
          <span>J</span>
          <span>M</span>
          <span>A</span>
          <span>+</span>
        </div>
        <p>
          Built for independent music professionals
          <span>From first preview to final delivery</span>
        </p>
      </div>
    </div>

    <div className="hero-visual" aria-label="Preview of a music project workspace">
      <div className="visual-orbit orbit-one" />
      <div className="visual-orbit orbit-two" />
      <div className="dashboard-window">
        <div className="dashboard-topbar">
          <div className="dashboard-brand">
            <span className="dashboard-logo">n</span>
            <span>northstar <b>STUDIO</b></span>
          </div>
          <div className="dashboard-profile">
            <span className="profile-name">Jordan Lee</span>
            <span className="profile-avatar">JL</span>
          </div>
        </div>
        <div className="dashboard-body">
          <div className="dashboard-greeting">
            <div>
              <span className="dashboard-overline">MONDAY, OCTOBER 20</span>
              <h2>Your studio, in motion.</h2>
            </div>
            <button className="new-project-button" type="button">
              <Plus size={14} /> New project
            </button>
          </div>
          <div className="project-stats">
            <div className="stat-card">
              <span>ACTIVE PROJECTS</span>
              <strong>08</strong>
              <small><i className="stat-trend">↗</i> 2 this week</small>
            </div>
            <div className="stat-card">
              <span>NEEDS YOUR EARS</span>
              <strong>03</strong>
              <small><Clock3 size={11} /> Awaiting feedback</small>
            </div>
            <div className="stat-card stat-revenue">
              <span>THIS MONTH</span>
              <strong>$4,280</strong>
              <small><i className="stat-trend">↗</i> Studio revenue</small>
            </div>
          </div>
          <div className="project-panel">
            <div className="project-panel-heading">
              <div>
                <span className="dashboard-overline">RECENT PROJECT</span>
                <h3>Golden Hour — Brand Film</h3>
              </div>
              <button className="icon-button" type="button" aria-label="More project options">
                <MoreHorizontal size={18} />
              </button>
            </div>
            <div className="track-row">
              <div className="track-art"><Headphones size={17} /></div>
              <div className="track-meta">
                <strong>Golden Hour / v.03</strong>
                <span>Mixed &amp; mastered · 02:48</span>
              </div>
              <span className="track-status"><span /> Preview shared</span>
            </div>
            <div className="audio-preview">
              <button className="play-button" type="button" aria-label="Play preview">
                <Play size={13} fill="currentColor" />
              </button>
              <span className="audio-time">0:08</span>
              <div className="waveform" aria-hidden="true">
                {waveform.map((height, index) => (
                  <i key={index} style={{ height: `${height}%` }} />
                ))}
              </div>
              <span className="audio-time">0:15</span>
            </div>
            <div className="client-feedback">
              <span className="feedback-avatar">AM</span>
              <p><strong>Alex Morgan</strong> left a note at <b>0:08</b></p>
              <span className="feedback-check"><Check size={12} /></span>
            </div>
          </div>
          <div className="dashboard-footer">
            <span><span className="secure-dot" /> Your workspace is looking good</span>
            <span>View all projects <ArrowUpRight size={11} /></span>
          </div>
        </div>
      </div>
      <div className="floating-note note-preview">
        <span className="note-icon note-icon-purple"><Play size={12} fill="currentColor" /></span>
        <span><b>Preview ready</b><small>A private clip, ready to share</small></span>
      </div>
      <div className="floating-note note-payment">
        <span className="note-icon note-icon-green"><Check size={14} /></span>
        <span><b>Payment received</b><small>Final delivery unlocked</small></span>
      </div>
    </div>
  </section>
);
