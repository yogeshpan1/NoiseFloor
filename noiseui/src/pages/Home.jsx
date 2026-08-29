import HeroSection from '../components/Dashboard/HeroSection';
import EventCards from '../components/Dashboard/EventCards';
import KeyFindings from '../components/Dashboard/KeyFindings';
import DidYouKnow from '../components/Dashboard/DidYouKnow';
import ChartsSection from '../components/Dashboard/ChartsSection';

export default function Home() {
  return (
    <div>
      <HeroSection />
      <EventCards />
      <KeyFindings />
      <DidYouKnow />
      <ChartsSection />
    </div>
  );
}
