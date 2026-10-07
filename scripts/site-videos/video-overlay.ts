import type { Page } from 'playwright-core';

import type { iOverlayPoint } from './site-video.types.ts';

const OVERLAY_ID = 'chaff-video-overlay';

/**
 * Draws what a screen recording of Electron leaves out: the mouse pointer and the keys being pressed.
 * Elements are built with the DOM and styled through CSSOM, which the renderer's content security policy allows.
 */
export class VideoOverlay {
  public constructor(private readonly page: Page) {}

  public async moveCursor(point: iOverlayPoint) {
    await this.ensureInstalled();
    await this.page.evaluate(
      ({ id, x, y }) => {
        const cursor = document.querySelector<HTMLElement>(`#${id} [data-part="cursor"]`);
        if (cursor) cursor.style.transform = `translate(${x}px, ${y}px)`;
      },
      { id: OVERLAY_ID, ...point },
    );
  }

  public async pressCursor(isPressed: boolean) {
    await this.page.evaluate(
      ({ id, isDown }) => {
        const ring = document.querySelector<HTMLElement>(`#${id} [data-part="ring"]`);
        if (ring) ring.style.opacity = isDown ? '1' : '0';
      },
      { id: OVERLAY_ID, isDown: isPressed },
    );
  }

  public async showKeycap(label: string, durationMs: number) {
    await this.ensureInstalled();
    await this.page.evaluate(
      ({ id, text, duration }) => {
        const keycap = document.querySelector<HTMLElement & { hideTimer?: number }>(`#${id} [data-part="keycap"]`);
        if (!keycap) return;
        keycap.textContent = text;
        keycap.style.opacity = '1';
        window.clearTimeout(keycap.hideTimer);
        keycap.hideTimer = window.setTimeout(() => {
          keycap.style.opacity = '0';
        }, duration);
      },
      { id: OVERLAY_ID, text: label, duration: durationMs },
    );
  }

  private async ensureInstalled() {
    await this.page.evaluate((id) => {
      if (document.getElementById(id)) return;
      const root = document.createElement('div');
      root.id = id;
      Object.assign(root.style, { position: 'fixed', inset: '0', pointerEvents: 'none', zIndex: '2147483647' });

      const cursor = document.createElement('div');
      cursor.dataset.part = 'cursor';
      Object.assign(cursor.style, {
        position: 'absolute',
        left: '0',
        top: '0',
        transition: 'transform 16ms linear',
        transform: 'translate(-100px, -100px)',
      });
      const ring = document.createElement('div');
      ring.dataset.part = 'ring';
      Object.assign(ring.style, {
        position: 'absolute',
        left: '-14px',
        top: '-14px',
        width: '28px',
        height: '28px',
        borderRadius: '50%',
        background: 'rgba(53, 103, 216, 0.28)',
        opacity: '0',
        transition: 'opacity 120ms',
      });
      const svgNamespace = 'http://www.w3.org/2000/svg';
      const arrow = document.createElementNS(svgNamespace, 'svg');
      arrow.setAttribute('width', '22');
      arrow.setAttribute('height', '28');
      arrow.setAttribute('viewBox', '0 0 22 28');
      Object.assign(arrow.style, { position: 'absolute', left: '-2px', top: '-2px', overflow: 'visible' });
      const path = document.createElementNS(svgNamespace, 'path');
      path.setAttribute('d', 'M2 2 L2 22 L7.5 17 L11 25.5 L14.5 24 L11 15.8 L18.5 15.8 Z');
      path.setAttribute('fill', '#111114');
      path.setAttribute('stroke', '#ffffff');
      path.setAttribute('stroke-width', '1.6');
      path.setAttribute('stroke-linejoin', 'round');
      arrow.append(path);
      cursor.append(ring, arrow);

      const keycap = document.createElement('div');
      keycap.dataset.part = 'keycap';
      Object.assign(keycap.style, {
        position: 'absolute',
        left: '50%',
        bottom: '120px',
        transform: 'translateX(-50%)',
        minWidth: '56px',
        padding: '10px 18px',
        borderRadius: '12px',
        background: 'rgba(17, 17, 20, 0.86)',
        border: '1px solid rgba(255, 255, 255, 0.18)',
        color: '#ededf0',
        font: '600 26px ui-monospace, Menlo, monospace',
        textAlign: 'center',
        opacity: '0',
        transition: 'opacity 160ms',
      });

      root.append(cursor, keycap);
      document.body.append(root);
    }, OVERLAY_ID);
  }
}
