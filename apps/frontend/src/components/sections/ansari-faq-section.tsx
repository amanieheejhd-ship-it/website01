'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import styles from './ansari-faq-section.module.css';

const faqs = [
  {
    question: 'What services does Ansari Space Craft provide?',
    answer:
      'We deliver complete home construction, interior and exterior design, modular kitchens, aluminium and glass work, ACP cladding, false ceilings, fabrication, railings, renovation and project execution.',
  },
  {
    question: 'Do you handle complete home construction from foundation to finish?',
    answer:
      'Yes. Our coordinated scope can cover civil work, structure, electrical, plumbing, flooring, ceilings, interiors, finishing and project coordination through handover.',
  },
  {
    question: 'Do you provide interior design and modular kitchen work?',
    answer:
      'Yes. We design and execute premium living rooms, bedrooms, modular kitchens, wardrobes, ceilings, lighting, wall treatments and custom interior details.',
  },
  {
    question: 'Do you handle aluminium, glass and ACP cladding work?',
    answer:
      'Yes. We provide integrated aluminium, architectural glass, ACP cladding, railings and related exterior-detail execution with materials suited to the project.',
  },
  {
    question: 'Can you manage both residential and commercial projects?',
    answer:
      'Yes. We work across villas, homes, apartments, renovations, offices and commercial spaces, tailoring design, execution and finishing to the site and brief.',
  },
  {
    question: 'How can I request a quotation or start a project?',
    answer:
      'Share your location, project type, approximate area and requirements. Our team will discuss the scope, design direction, estimated budget and next steps with you.',
  },
];

export function AnsariFaqSection({ children }: { children: ReactNode }) {
  const [isContactRevealed, setContactRevealed] = useState(false);

  const scrollToContact = useCallback(() => {
    const contact = document.getElementById('contact');
    if (!contact) return;

    contact.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'start',
    });
  }, []);

  useEffect(() => {
    if (!isContactRevealed) return;

    const frame = window.requestAnimationFrame(scrollToContact);
    return () => window.cancelAnimationFrame(frame);
  }, [isContactRevealed, scrollToContact]);

  const handleStartProject = () => {
    if (isContactRevealed) {
      scrollToContact();
      return;
    }

    setContactRevealed(true);
  };

  return (
    <>
      <section id="faq" className={styles.faqSection} aria-labelledby="faq-title">
        {/* FARDEEN_FAQ_COMPONENT_V2 */}
        <div className={styles.ambientGlow} />

        <div className={styles.container}>
          <div className={styles.left}>
            <p className={styles.kicker}>FAQ</p>

            <h2 id="faq-title" className={styles.title}>
              Frequently
              <br />
              asked
              <br />
              questions
            </h2>

            <p className={styles.subtitle}>
              Quick answers before starting your
              construction or interior project with
              Ansari Space Craft.
            </p>

            <div className={styles.network} aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
          </div>

          <div className={styles.right}>
            <div className={styles.questions}>
              {faqs.map((faq) => (
                <details key={faq.question} className={styles.item}>
                  <summary className={styles.question}>
                    <span>{faq.question}</span>
                    <span className={styles.arrow} aria-hidden="true">
                      <i />
                      <i />
                    </span>
                  </summary>

                  <div className={styles.answer}>{faq.answer}</div>
                </details>
              ))}
            </div>

            <div className={styles.bottom}>
              <div>
                <span className={styles.bottomLabel}>HAVE SOMETHING SPECIFIC IN MIND?</span>
                <p>
                  Tell us what you're planning and
                  we'll guide you through the next step.
                </p>
              </div>

              <button
                type="button"
                className={styles.cta}
                onClick={handleStartProject}
                aria-controls="contact"
                aria-expanded={isContactRevealed}
              >
                Start your project
                <span>→</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {isContactRevealed ? <div className={styles.contactReveal}>{children}</div> : null}
    </>
  );
}
