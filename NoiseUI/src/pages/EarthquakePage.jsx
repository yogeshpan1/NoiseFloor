import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import IncidentDetail from '../components/Dashboard/IncidentDetail';

export default function EarthquakePage() {
  return (
    <IncidentDetail
      incidentId="earthquake2015"
      periodLabel="2015 Earthquake"
      eventLogDateRange={['2015-04-25', '2015-05-12']}
      heroIcon={ExclamationTriangleIcon}
    />
  );
}
