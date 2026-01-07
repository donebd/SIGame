/**
 * Base UI Component
 * Base class for UI components
 */

export abstract class BaseUI {
  protected container: HTMLElement;

  constructor(containerId: string) {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container with id "${containerId}" not found`);
    }
    this.container = container;
  }

  /**
   * Show component
   */
  show(): void {
    this.container.classList.remove('hidden');
  }

  /**
   * Hide component
   */
  hide(): void {
    this.container.classList.add('hidden');
  }

  /**
   * Check if visible
   */
  isVisible(): boolean {
    return !this.container.classList.contains('hidden');
  }
}
