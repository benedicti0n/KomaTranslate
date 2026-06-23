/** Handle returned when an overlay root is mounted into a host page. */
export interface OverlayRoot {
  /** The ShadowRoot we render overlays into. */
  readonly shadowRoot: ShadowRoot;
  /** The host element appended to the document. */
  readonly hostElement: HTMLElement;
  /** Removes the host element and detaches the shadow root. */
  readonly destroy: () => void;
}

/** Options for the temporary diagnostic overlay. */
export interface DiagnosticOverlayOptions {
  readonly label?: string;
  readonly backgroundColor?: string;
}
