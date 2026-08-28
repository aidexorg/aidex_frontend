import type { Action } from '@/types';

export interface PeriodProgress {
  complete: number;
  planned: number;
  incomplete: number;
  total: number;
  percentComplete: number;
}

export function computePeriodProgress(actions: Action[]): PeriodProgress {
  let complete = 0;
  let planned = 0;
  let incomplete = 0;

  for (const action of actions) {
    if (action.status === 'complete') complete += 1;
    else if (action.status === 'planned') planned += 1;
    else if (action.status === 'incomplete') incomplete += 1;
  }

  const total = complete + planned + incomplete;
  const percentComplete = total > 0 ? Math.round((complete / total) * 100) : 0;

  return { complete, planned, incomplete, total, percentComplete };
}

export function filterPlannedActions(actions: Action[]): Action[] {
  return actions.filter((action) => action.status === 'planned');
}
