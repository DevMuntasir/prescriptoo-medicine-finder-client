export type RouteStatus = 'idle' | 'pending' | 'ready' | 'error';
export interface LocatorState {
  origin: 'none' | 'area' | 'pin';
  selected: string | null;
  mode: 'Walking' | 'Driving';
  route: RouteStatus;
  requestId: number;
}
export const initialLocator: LocatorState = {
  origin: 'none',
  selected: null,
  mode: 'Walking',
  route: 'idle',
  requestId: 0,
};
export type LocatorAction =
  | { type: 'origin'; origin: LocatorState['origin'] }
  | { type: 'select'; id: string }
  | { type: 'mode'; mode: LocatorState['mode'] }
  | { type: 'confirm-pin' }
  | { type: 'request'; confirmedPin?: boolean }
  | { type: 'response'; id: number; status: 'ready' | 'error' };
export function locatorReducer(state: LocatorState, action: LocatorAction): LocatorState {
  switch (action.type) {
    case 'origin':
      return {
        ...state,
        origin: action.origin,
        selected: null,
        route: 'idle',
        requestId: state.requestId + 1,
      };
    case 'select':
      return { ...state, selected: action.id, route: 'idle', requestId: state.requestId + 1 };
    case 'mode':
      return { ...state, mode: action.mode, route: 'idle', requestId: state.requestId + 1 };
    case 'confirm-pin':
      return { ...state, origin: 'pin', route: 'idle', requestId: state.requestId + 1 };
    case 'request':
      return {
        ...state,
        origin: action.confirmedPin ? 'pin' : state.origin,
        route: 'pending',
        requestId: state.requestId + 1,
      };
    case 'response':
      return action.id === state.requestId ? { ...state, route: action.status } : state;
  }
}
