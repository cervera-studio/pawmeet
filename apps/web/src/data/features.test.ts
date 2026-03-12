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

  it('every feature has an iconName (non-empty string)', () => {
    for (const feature of features) {
      expect(feature.iconName.length).toBeGreaterThan(0);
    }
  });

  it('has no duplicate titles', () => {
    const titles = features.map((f) => f.title);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it('has no duplicate iconNames', () => {
    const icons = features.map((f) => f.iconName);
    expect(new Set(icons).size).toBe(icons.length);
  });

  it('contains the "Mappa interattiva" feature', () => {
    const mapFeature = features.find((f) => f.title === 'Mappa interattiva');
    expect(mapFeature).toBeDefined();
  });

  it('contains the "Match intelligente" feature as highlighted', () => {
    const matchFeature = features.find((f) => f.title === 'Match intelligente');
    expect(matchFeature).toBeDefined();
    expect(matchFeature?.highlighted).toBe(true);
  });

  it('contains the "Tracciamento percorsi" feature as comingSoon', () => {
    const trackingFeature = features.find((f) => f.title === 'Tracciamento percorsi');
    expect(trackingFeature).toBeDefined();
    expect(trackingFeature?.comingSoon).toBe(true);
  });
});
