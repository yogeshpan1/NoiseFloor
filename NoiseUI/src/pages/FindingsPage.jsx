import { motion } from 'framer-motion';
import KeyFindings from '../components/Dashboard/KeyFindings';
import DidYouKnow from '../components/Dashboard/DidYouKnow';
import QuadClassSection from '../components/Dashboard/QuadClassSection';
import { fadeInUp } from '../utils/helpers';

export default function FindingsPage() {
  return (
    <div>
      <div className="px-6 pb-4 pt-16 sm:pt-20">
        <motion.p
          initial="hidden"
          animate="visible"
          variants={fadeInUp}
          className="mx-auto max-w-6xl text-sm uppercase tracking-[0.2em] text-gold"
        >
          The Complete Picture
        </motion.p>
      </div>
      <KeyFindings />
      <DidYouKnow />
      <QuadClassSection />
    </div>
  );
}
