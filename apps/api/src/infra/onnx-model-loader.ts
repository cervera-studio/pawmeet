import * as fs from 'node:fs';
import * as path from 'node:path';
import process from 'node:process';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { logger } from '@pawmeet/utils';
import { redis } from '../lib/redis.js';

const MODEL_DIR = '/tmp/ml-models';
const R2_BUCKET = process.env.R2_BUCKET || 'pawmeet';
const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

interface OnnxTensor {
  data: number[];
}

interface OnnxInferenceSession {
  run(feeds: Record<string, unknown>): Promise<Record<string, OnnxTensor>>;
}

interface OnnxRuntime {
  Tensor: new (type: string, data: Float32Array, dims: number[]) => unknown;
  InferenceSession: {
    create(path: string): Promise<OnnxInferenceSession>;
  };
}

export class OnnxModelLoader {
  private session: OnnxInferenceSession | null = null;
  private currentVersion: string | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private ort: OnnxRuntime | null = null;

  async initialize(): Promise<void> {
    // Try to load onnxruntime-node (optional dependency — installed only in production)
    // Dynamic string prevents TypeScript from resolving the module at compile time
    try {
      const moduleName = 'onnxruntime-node';
      this.ort = await import(moduleName);
    } catch {
      logger.warn('onnx-model-loader', 'onnxruntime-node not installed, ML inference disabled');
      return;
    }

    await this.loadActiveModel();
    this.startPolling();
  }

  async shutdown(): Promise<void> {
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.session = null;
  }

  isReady(): boolean {
    return this.session !== null;
  }

  getVersion(): string | null {
    return this.currentVersion;
  }

  async predict(features: number[]): Promise<number> {
    if (!(this.session && this.ort)) {
      throw new Error('Model not loaded');
    }

    const inputTensor = new this.ort.Tensor('float32', Float32Array.from(features), [
      1,
      features.length,
    ]);
    const results = await this.session.run({ input: inputTensor });

    // LightGBM ONNX models output a tensor named 'variable' or 'output_label'
    const outputKey = Object.keys(results)[0];
    if (!outputKey) throw new Error('Model produced no output');
    const output = results[outputKey];
    if (!output) throw new Error('Model output tensor missing');
    return output.data[0] ?? 0;
  }

  private async loadActiveModel(): Promise<void> {
    const version = await redis.get<string>('ml:model:active');
    if (!version) {
      logger.info('onnx-model-loader', 'No active model version in Redis');
      return;
    }

    if (version === this.currentVersion && this.session) {
      return; // Already loaded
    }

    await this.loadModel(version);
  }

  private async loadModel(version: string): Promise<void> {
    // Validate version format to prevent path traversal (e.g., ../../etc/passwd)
    if (!/^[a-zA-Z0-9._-]+$/.test(version)) {
      logger.error('onnx-model-loader', `Invalid model version format: ${version}`);
      return;
    }

    const modelDir = path.join(MODEL_DIR, version);
    const modelPath = path.join(modelDir, 'model.onnx');

    // Check local cache
    if (!fs.existsSync(modelPath)) {
      fs.mkdirSync(modelDir, { recursive: true });
      await this.downloadFromR2(`models/matching/${version}/model.onnx`, modelPath);
    }

    // Load into ONNX Runtime
    try {
      if (!this.ort) return;
      const newSession = await this.ort.InferenceSession.create(modelPath);
      this.session = newSession;
      this.currentVersion = version;

      logger.info('onnx-model-loader', `Model ${version} loaded successfully`);
    } catch (error) {
      logger.error('onnx-model-loader', `Failed to load model ${version}`, error);
    }
  }

  private async downloadFromR2(key: string, destPath: string): Promise<void> {
    // Lazy import R2 client to avoid env var checks at import time
    const { r2 } = await import('../lib/r2.js');

    const command = new GetObjectCommand({ Bucket: R2_BUCKET, Key: key });
    const response = await r2.send(command);

    if (!response.Body) {
      throw new Error(`Empty response from R2 for key: ${key}`);
    }

    const chunks: Uint8Array[] = [];
    for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }

    fs.writeFileSync(destPath, Buffer.concat(chunks));
    logger.info('onnx-model-loader', `Downloaded ${key} to ${destPath}`);
  }

  private startPolling(): void {
    this.pollTimer = setInterval(async () => {
      try {
        await this.loadActiveModel();
      } catch (error) {
        logger.warn('onnx-model-loader', 'Failed to poll for model update', error);
      }
    }, POLL_INTERVAL_MS);
  }
}
