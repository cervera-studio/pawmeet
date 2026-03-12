import { features } from './features';

describe('features', () => {
  it('contains exactly 6 features', () => {
    expect(features).toHaveLength(6);
  });

  it('every feature has a non-empty id', () => {
    for (const feature of features) {
      expect(feature.id.length).toBeGreaterThan(0);
    }
  });

  it('every feature has an iconName (non-empty string)', () => {
    for (const feature of features) {
      expect(feature.iconName.length).toBeGreaterThan(0);
    }
  });

  it('has no duplicate ids', () => {
    const ids = features.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has no duplicate iconNames', () => {
    const icons = features.map((f) => f.iconName);
    expect(new Set(icons).size).toBe(icons.length);
  });

  it('contains the "interactiveMap" feature', () => {
    const mapFeature = features.find((f) => f.id === 'interactiveMap');
    expect(mapFeature).toBeDefined();
  });

  it('contains the "smartMatch" feature as highlighted', () => {
    const matchFeature = features.find((f) => f.id === 'smartMatch');
    expect(matchFeature).toBeDefined();
    expect(matchFeature?.highlighted).toBe(true);
  });

  it('contains the "routeTracking" feature as comingSoon', () => {
    const trackingFeature = features.find((f) => f.id === 'routeTracking');
    expect(trackingFeature).toBeDefined();
    expect(trackingFeature?.comingSoon).toBe(true);
  });
});
