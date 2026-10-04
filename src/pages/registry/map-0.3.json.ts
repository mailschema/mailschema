import { currentCatalog } from '../../data/types';
export function GET() {
  return Response.json(currentCatalog);
}
