import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ExclamationTriangleIcon, GlobeAsiaAustraliaIcon, MegaphoneIcon } from '@heroicons/react/24/outline';
import { INCIDENTS } from '../../data/nepalData';
import { formatTone, staggerContainer, fadeInUp, headingReveal } from '../../utils/helpers';
import { useScrollReveal } from '../../hooks/useScrollReveal';

const EVENTS_META = [
  {
    incidentId: 'earthquake2015',
    to: '/earthquake',
    icon: ExclamationTriangleIcon,
    title: '2015 Nepal Earthquake',
    subtitle: '7.8 magnitude',
    blurb: 'The Gorkha earthquake killed ~9,000 and triggered a global humanitarian media surge.',
  },
  {
    incidentId: 'blockade2015',
    to: '/blockade',
    icon: GlobeAsiaAustraliaIcon,
    title: '2015 India-Nepal Border Blockade',
    subtitle: '5-month border shutdown',
    blurb: "Cargo trucks stalled at the border for months amid disputes over Nepal's new constitution.",
  },
  {
    incidentId: 'genz2025',
    to: '/protests',
    icon: MegaphoneIcon,
    title: '2025 Gen-Z Protests',
    subtitle: 'Peaked Sept 9 — interim government Sept 12',
    blurb: 'A social-media ban sparked youth protests; parliament burned and PM Oli resigned within days.',
  },
];

function toneFor(incidentId, country) {
  const row = INCIDENTS.find((i) => i.id === incidentId && i.country === country);
  return row ? row.avgTone : null;
}

export default function EventCards() {
  const [ref, isVisible] = useScrollReveal();

  return (
    <section className="px-6 py-16 sm:py-20">
      <div ref={ref} className="mx-auto max-w-6xl">
        <motion.h2
          initial="hidden"
          animate={isVisible ? 'visible' : 'hidden'}
          variants={headingReveal}
          className="mb-10 text-h2 font-serif font-bold text-text-primary"
        >
          The 3 Major Events
        </motion.h2>
        <motion.div
          initial="hidden"
          animate={isVisible ? 'visible' : 'hidden'}
          variants={staggerContainer}
          className="grid grid-cols-1 gap-6 tablet:grid-cols-2 desktop:grid-cols-3"
        >
          {EVENTS_META.map((event) => {
            const india = toneFor(event.incidentId, 'India');
            const china = toneFor(event.incidentId, 'China');
            const Icon = event.icon;
            return (
              <motion.div key={event.incidentId} variants={fadeInUp}>
                <Link to={event.to} className="block h-full min-h-[44px]">
                  <motion.div
                    whileHover={{ scale: 1.03, y: -6, boxShadow: '0 30px 70px -25px rgba(212,175,55,0.35)' }}
                    transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
                    className="flex h-full flex-col gap-4 rounded-2xl border border-white/10 bg-bg-card p-6"
                  >
                    <Icon className="h-8 w-8 text-gold" />
                    <div>
                      <h3 className="font-serif text-h3 font-semibold text-text-primary">{event.title}</h3>
                      <p className="mt-1 text-sm font-medium text-gold-bright">{event.subtitle}</p>
                    </div>
                    <p className="flex-1 text-sm leading-relaxed text-text-secondary">{event.blurb}</p>
                    {india !== null && (
                      <div className="flex gap-4 border-t border-white/10 pt-4 text-xs">
                        <span className="text-india">India {formatTone(india)}</span>
                        <span className="text-china">China {formatTone(china)}</span>
                      </div>
                    )}
                  </motion.div>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
