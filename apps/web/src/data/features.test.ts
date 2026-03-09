import { features } from './features';

describe('features', () => {
  it('contains exactly 6 features', () => {
    expect(features).toHaveLength(6);
  });

  it('every feature has a non-empty title', () => {
    for (const feature of features) {
      expect(feature.title.length).toBeGreaterThan(0);
    }
  });

  it('every feature has a description of at least 20 characters', () => {
    for (const feature of features) {
      expect(feature.description.length).toBeGreaterThanOrEqual(20);
    }
  });

  it('every feature has an icon (non-empty string)', () => {
    for (const feature of features) {
      expect(feature.icon.length).toBeGreaterThan(0);
    }
  });

  it('has no duplicate titles', () => {
    const titles = features.map((f) => f.title);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it('has no duplicate icons', () => {
    const icons = features.map((f) => f.icon);
    expect(new Set(icons).size).toBe(icons.length);
  });

  it('each feature object has exactly 3 keys', () => {
    for (const feature of features) {
      expect(Object.keys(feature)).toHaveLength(3);
    }
  });

  it('contains the "Mappa interattiva" feature', () => {
    const mapFeature = features.find((f) => f.title === 'Mappa interattiva');
    expect(mapFeature).toBeDefined();
  });

  it('contains the "Match intelligente" feature', () => {
    const matchFeature = features.find((f) => f.title === 'Match intelligente');
    expect(matchFeature).toBeDefined();
  });

  it('contains the "Tracciamento percorsi" feature', () => {
    const trackingFeature = features.find((f) => f.title === 'Tracciamento percorsi');
    expect(trackingFeature).toBeDefined();
  });
});
