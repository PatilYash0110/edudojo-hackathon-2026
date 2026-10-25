/**
 * Page: /dojo/[dojoId]
 *
 * OWNER: FRONTEND TEAM
 * The 2.5D pagoda tower; falls back to the flat DojoMap when WebGL is unavailable.
 */
import { TowerMap } from './TowerMap';

export default function DojoMapPage() {
  return <TowerMap />;
}
