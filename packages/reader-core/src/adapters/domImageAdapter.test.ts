import { describe, expect, it, beforeEach, vi } from 'vitest';
import { createDomImageAdapter } from './domImageAdapter.js';
import type { PageCandidate } from '../types.js';

const mockRect = (width: number, height: number) =>
  new DOMRectReadOnly(0, 0, width, height);

describe('createDomImageAdapter', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('discovers visible images above the minimum size', () => {
    document.body.innerHTML = `
      <img src="https://example.com/page1.jpg" />
      <img src="https://example.com/icon.png" />
      <img src="https://example.com/page2.jpg" />
    `;

    const images = document.querySelectorAll('img');
    vi.spyOn(images[0], 'getBoundingClientRect').mockReturnValue(mockRect(800, 1000));
    vi.spyOn(images[1], 'getBoundingClientRect').mockReturnValue(mockRect(16, 16));
    vi.spyOn(images[2], 'getBoundingClientRect').mockReturnValue(mockRect(800, 1000));

    const adapter = createDomImageAdapter();
    const candidates = adapter.discover();

    expect(candidates).toHaveLength(2);
    expect(candidates.map((c: PageCandidate) => c.fingerprint)).toEqual([
      'https://example.com/page1.jpg',
      'https://example.com/page2.jpg',
    ]);
  });

  it('marks discovered elements with a data attribute', () => {
    document.body.innerHTML = `<img src="https://example.com/page1.jpg" />`;

    const img = document.querySelector('img')!;
    vi.spyOn(img, 'getBoundingClientRect').mockReturnValue(mockRect(800, 1000));

    createDomImageAdapter().discover();
    expect(img.getAttribute('data-manga-translator-id')).toMatch(/^mt-/);
  });

  it('notifies subscribers when images are added dynamically', async () => {
    document.body.innerHTML = '';
    const adapter = createDomImageAdapter();

    let captured: ReturnType<typeof adapter.discover> = [];
    adapter.subscribe((candidates: PageCandidate[]) => {
      captured = candidates;
    });

    const img = document.createElement('img');
    img.src = 'https://example.com/page1.jpg';
    vi.spyOn(img, 'getBoundingClientRect').mockReturnValue(mockRect(800, 1000));
    document.body.appendChild(img);

    // MutationObserver is async; give it a tick.
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(captured).toHaveLength(1);
    expect(captured[0]?.fingerprint).toBe('https://example.com/page1.jpg');
  });
});
