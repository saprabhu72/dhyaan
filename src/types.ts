export interface Stage {
  id: string;
  interval: number;
  unit: 'minutes' | 'seconds';
  chimes: number;
}
