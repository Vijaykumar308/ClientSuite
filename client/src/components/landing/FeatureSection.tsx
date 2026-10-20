import {
  AudioLines,
  CreditCard,
  Fingerprint,
  MessageCircle,
  Palette,
  UsersRound,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface Feature {
  icon: LucideIcon;
  number: string;
  title: string;
  description: string;
  tone: string;
}

const features: Feature[] = [
  {
    icon: UsersRound,
    number: '01',
    title: 'Clients & projects, together',
    description: 'Keep client details, project status, deadlines, and notes in one organized studio workspace.',
    tone: 'lavender',
  },
  {
    icon: AudioLines,
    number: '02',
    title: 'Share a listen, not the master',
    description: 'Give clients a secure, short audio preview while your original files stay private.',
    tone: 'blue',
  },
  {
    icon: MessageCircle,
    number: '03',
    title: 'Feedback that finds its moment',
    description: 'Collect clear client comments and timecoded notes without losing the conversation.',
    tone: 'peach',
  },
  {
    icon: CreditCard,
    number: '04',
    title: 'A smoother way to get paid',
    description: 'Track project payment status and connect your own supported payment gateway.',
    tone: 'mint',
  },
  {
    icon: Palette,
    number: '05',
    title: 'A portal that feels like yours',
    description: 'Make the client-facing experience your own with studio branding and a custom look.',
    tone: 'pink',
  },
  {
    icon: Fingerprint,
    number: '06',
    title: 'Your studio stays yours',
    description: 'Keep each workspace private, with tenant-aware data separation built into the platform.',
    tone: 'gold',
  },
];

export const FeatureSection = () => (
  <section className="features-section section-wrap" id="features">
    <div className="section-heading">
      <div>
        <span className="eyebrow">A BETTER WAY TO RUN YOUR STUDIO</span>
        <h2>All the moving parts.<br /><span>One beautiful rhythm.</span></h2>
      </div>
      <p>
        The admin that supports your craft, not another thing competing for your
        attention.
      </p>
    </div>
    <div className="features-grid">
      {features.map(({ icon: Icon, number, title, description, tone }) => (
        <article className="feature-card" key={number}>
          <div className="feature-card-top">
            <span className={`feature-icon icon-${tone}`}><Icon size={20} strokeWidth={1.8} /></span>
            <span className="feature-number">{number}</span>
          </div>
          <h3>{title}</h3>
          <p>{description}</p>
        </article>
      ))}
    </div>
  </section>
);
