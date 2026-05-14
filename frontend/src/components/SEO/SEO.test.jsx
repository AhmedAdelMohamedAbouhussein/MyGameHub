import { describe, it, expect } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';
import SEO from './SEO';

describe('SEO Component', () => {
  it('generates correct metadata state for the homepage', async () => {
    render(
      <HelmetProvider>
        <MemoryRouter initialEntries={['/']}>
          <SEO title="Home" description="Test Description" />
        </MemoryRouter>
      </HelmetProvider>
    );

    await waitFor(() => expect(document.title).toContain('Home | My GameHub'));
    
    expect(document.querySelector('meta[name="description"]').getAttribute('content')).toBe('Test Description');
    expect(document.querySelector('link[rel="canonical"]').getAttribute('href')).toBe('https://my-gamehub.com');
  });

  it('normalizes trailing slashes and forces lowercase in canonical URLs', async () => {
    render(
      <HelmetProvider>
        <MemoryRouter initialEntries={['/Games/']}>
          <SEO title="Browse" />
        </MemoryRouter>
      </HelmetProvider>
    );

    await waitFor(() => {
        const canonical = document.querySelector('link[rel="canonical"]');
        return expect(canonical.getAttribute('href')).toBe('https://my-gamehub.com/games');
    });
  });

  it('correctly handles ID-based game canonical URLs', async () => {
    render(
      <HelmetProvider>
        <MemoryRouter initialEntries={['/games/3498']}>
          <SEO title="Elden Ring" />
        </MemoryRouter>
      </HelmetProvider>
    );

    await waitFor(() => {
        const canonical = document.querySelector('link[rel="canonical"]');
        return expect(canonical.getAttribute('href')).toBe('https://my-gamehub.com/games/3498');
    });
  });

  it('renders dynamic images correctly', async () => {
    const testImage = 'https://example.com/game.jpg';
    render(
      <HelmetProvider>
        <MemoryRouter initialEntries={['/games/1']}>
          <SEO title="Game" image={testImage} />
        </MemoryRouter>
      </HelmetProvider>
    );

    await waitFor(() => {
        const ogImage = document.querySelector('meta[property="og:image"]');
        return expect(ogImage.getAttribute('content')).toBe(testImage);
    });
    
    expect(document.querySelector('meta[name="twitter:image"]').getAttribute('content')).toBe(testImage);
  });
});
