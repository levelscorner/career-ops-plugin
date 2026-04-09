import { useLiveQuery } from 'dexie-react-hooks';
import { getDb } from '../../background/storage/db';
import type { Application } from '../../shared/types';

export function useApplications(): Application[] {
  const list = useLiveQuery(
    () => getDb().applications.orderBy('updatedAt').reverse().toArray(),
    [],
    [] as Application[],
  );
  return list ?? [];
}

export function useApplication(id: string | undefined): Application | undefined {
  return useLiveQuery(
    () => (id ? getDb().applications.get(id) : undefined),
    [id],
  );
}
