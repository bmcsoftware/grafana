import { EchoBackend, EchoEvent, EchoEventType } from '@grafana/runtime';
// @Copyright 2024 BMC Software, Inc.
// Date - 02/02/2024
// Commented unsued code
// import { backendSrv } from '../../backend_srv';
// END
export interface PerformanceEventPayload {
  name: string;
  value: number;
}

export interface PerformanceEvent extends EchoEvent<EchoEventType.Performance, PerformanceEventPayload> {}

export interface PerformanceBackendOptions {
  url?: string;
}

/**
 * Echo's performance metrics consumer
 * Reports performance metrics to given url (TODO)
 */
export class PerformanceBackend implements EchoBackend<PerformanceEvent, PerformanceBackendOptions> {
  private buffer: PerformanceEventPayload[] = [];
  supportedEvents = [EchoEventType.Performance];

  constructor(public options: PerformanceBackendOptions) {}

  addEvent = (e: EchoEvent) => {
    this.buffer.push(e.payload);
  };

  flush = () => {
    if (this.buffer.length === 0) {
      return;
    }
    // @Copyright 2024 BMC Software, Inc.
    // Date - 02/02/2024
    // Stopped metrics API call
    // backendSrv.post('/api/frontend-metrics', {
    //   events: this.buffer,
    // });
    // End
    this.buffer = [];
  };
}
