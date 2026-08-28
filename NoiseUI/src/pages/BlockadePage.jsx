import { GlobeAsiaAustraliaIcon } from '@heroicons/react/24/outline';
import IncidentDetail from '../components/Dashboard/IncidentDetail';

export default function BlockadePage() {
  return (
    <IncidentDetail
      incidentId="blockade2015"
      periodLabel="2015 Blockade"
      eventLogDateRange={['2015-09-20', '2015-09-23']}
      heroIcon={GlobeAsiaAustraliaIcon}
    />
  );
}
