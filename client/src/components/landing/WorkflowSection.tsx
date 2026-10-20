import { ArrowRight, Check, MessageSquareText, Music2, Send } from 'lucide-react';

const steps = [
  {
    number: '01',
    icon: Music2,
    title: 'Set up the project',
    description: 'Bring your client, project details, and audio versions into one place.',
  },
  {
    number: '02',
    icon: Send,
    title: 'Share a private preview',
    description: 'Send a polished client portal with a short preview, ready for a first listen.',
  },
  {
    number: '03',
    icon: MessageSquareText,
    title: 'Get feedback & deliver',
    description: 'Keep notes, approval, payment, and final delivery moving in the same workflow.',
  },
];

export const WorkflowSection = () => (
  <section className="workflow-section" id="workflow">
    <div className="section-wrap workflow-inner">
      <div className="workflow-heading">
        <span className="eyebrow">FROM FIRST NOTE TO FINAL FILE</span>
        <h2>A workflow that<br /><span>just flows.</span></h2>
        <p>Keep your client experience polished at every step, while you stay focused on the work.</p>
        <a className="text-link" href="#contact">See what your studio could look like <ArrowRight size={15} /></a>
      </div>
      <div className="workflow-steps">
        {steps.map(({ number, icon: Icon, title, description }, index) => (
          <article className="workflow-step" key={number}>
            <div className="step-rail">
              <span className="step-icon"><Icon size={18} /></span>
              {index < steps.length - 1 && <span className="step-line" />}
            </div>
            <div className="step-copy">
              <span className="step-number">STEP {number}</span>
              <h3>{title}</h3>
              <p>{description}</p>
            </div>
            {index === steps.length - 1 && <span className="step-complete"><Check size={13} /></span>}
          </article>
        ))}
      </div>
    </div>
  </section>
);
