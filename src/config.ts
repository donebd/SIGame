/**
 * SIGame — Shared Configuration
 * Central config to avoid hardcoding values across multiple files.
 */

/** Port for the PeerJS signaling server */
export const PEER_PORT = 9001;

/**
 * Host for the PeerJS signaling server.
 * Falls back to 'localhost' when the app is opened as a local file (file://)
 * or when hostname is empty.
 */
export const PEER_HOST = window.location.hostname || 'localhost';
