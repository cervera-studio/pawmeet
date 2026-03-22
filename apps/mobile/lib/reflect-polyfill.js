// Minimal Reflect.metadata polyfill for tsyringe (no decorators needed).
// Full reflect-metadata pulls in APIs incompatible with Expo Go.
if (typeof Reflect === 'undefined') {
  globalThis.Reflect = {};
}
if (typeof Reflect.getMetadata !== 'function') {
  const metadataMap = new WeakMap();

  function getMap(target) {
    if (!metadataMap.has(target)) {
      metadataMap.set(target, new Map());
    }
    return metadataMap.get(target);
  }

  function toKey(key, prop) {
    return prop === undefined ? String(key) : `${String(key)}:${String(prop)}`;
  }

  Reflect.defineMetadata = (key, value, target, prop) => {
    getMap(target).set(toKey(key, prop), value);
  };
  Reflect.getMetadata = (key, target, prop) => getMap(target).get(toKey(key, prop));
  Reflect.getOwnMetadata = Reflect.getMetadata;
  Reflect.hasMetadata = (key, target, prop) => getMap(target).has(toKey(key, prop));
  Reflect.hasOwnMetadata = Reflect.hasMetadata;
  Reflect.metadata = (key, value) => (target) => {
    Reflect.defineMetadata(key, value, target);
  };
}
