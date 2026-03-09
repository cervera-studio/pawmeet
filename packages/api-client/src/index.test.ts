import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = dirname(fileURLToPath(import.meta.url));

describe('api-client package', () => {
  describe('module exports', () => {
    it('should be importable without errors', async () => {
      const mod = await import('./index');
      expect(mod).toBeDefined();
    });

    it('should export an empty module (stub)', async () => {
      const mod = await import('./index');
      const exportedKeys = Object.keys(mod);
      expect(exportedKeys).toEqual([]);
    });
  });

  describe('tRPC dependencies', () => {
    it('should have @trpc/client resolvable with createTRPCClient', async () => {
      const trpcClient = await import('@trpc/client');
      expect(trpcClient.createTRPCClient).toBeTypeOf('function');
    });

    it('should have @trpc/client resolvable with httpBatchLink', async () => {
      const trpcClient = await import('@trpc/client');
      expect(trpcClient.httpBatchLink).toBeTypeOf('function');
    });

    it('should have @trpc/react-query resolvable with createTRPCReact', async () => {
      const trpcReact = await import('@trpc/react-query');
      expect(trpcReact.createTRPCReact).toBeTypeOf('function');
    });
  });

  describe('package.json configuration', () => {
    const pkgPath = resolve(currentDir, '..', 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));

    it('should have the correct package name', () => {
      expect(pkg.name).toBe('@dogwalk/api-client');
    });

    it('should be marked as private', () => {
      expect(pkg.private).toBe(true);
    });

    it('should use ESM module type', () => {
      expect(pkg.type).toBe('module');
    });

    it('should point main to src/index.ts for internal monorepo usage', () => {
      expect(pkg.main).toBe('./src/index.ts');
    });

    it('should point types to src/index.ts', () => {
      expect(pkg.types).toBe('./src/index.ts');
    });

    it('should declare @trpc/client as a dependency', () => {
      expect(pkg.dependencies).toHaveProperty('@trpc/client');
    });

    it('should declare @trpc/react-query as a dependency', () => {
      expect(pkg.dependencies).toHaveProperty('@trpc/react-query');
    });
  });
});
