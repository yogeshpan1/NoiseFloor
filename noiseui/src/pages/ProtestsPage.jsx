import { MegaphoneIcon } from '@heroicons/react/24/outline';
import IncidentDetail from '../components/Dashboard/IncidentDetail';

export default function ProtestsPage() {
  return (
    <IncidentDetail
      incidentId="genz2025"
      periodLabel="2025 Gen-Z Protest"
      eventLogDateRange={['2025-09-08', '2025-09-12']}
      heroIcon={MegaphoneIcon}
    />
  );
}
