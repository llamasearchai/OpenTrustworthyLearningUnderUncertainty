/**
 * API Module Exports
 * @module lib/api
 */

export {
  api,
  wsClient,
  WebSocketClient,
  ApiClientError,
  NetworkError,
  TimeoutError,
  type RetryConfig,
  type WebSocketClientOptions,
  type WebSocketMessageHandler,
} from './client';
