import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { logger } from '@pawmeet/utils';
import { z } from 'zod';

const R2_BUCKET = process.env.R2_BUCKET || 'pawmeet';

/** Validates model version to prevent path traversal in R2 keys. */
function validateVersion(version: string): void {
  if (!/^[a-zA-Z0-9._-]+$/.test(version)) {
    throw new Error(`Invalid model version format: ${version}`);
  }
}

const featureSchemaValidator = z.array(z.string());

const metricsValidator = z.object({
  rmse: z.number(),
  auc: z.number(),
  ndcg: z.number().optional(),
  precision: z.number(),
  recall: z.number(),
});

/** Lazy-load the R2 client to avoid env-var checks at import time */
async function getR2() {
  const { r2 } = await import('../lib/r2.js');
  return r2;
}

export interface ModelArtifacts {
  model: Buffer;
  featureSchema: string[];
  metrics: { rmse: number; auc: number; ndcg?: number; precision: number; recall: number };
}

/**
 * Upload model artifacts to R2.
 * Path: models/matching/{version}/model.onnx
 *       models/matching/{version}/feature_schema.json
 *       models/matching/{version}/metrics.json
 */
export async function uploadModelArtifacts(
  version: string,
  artifacts: ModelArtifacts,
): Promise<void> {
  validateVersion(version);
  const r2 = await getR2();
  const prefix = `models/matching/${version}`;

  await Promise.all([
    r2.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: `${prefix}/model.onnx`,
        Body: artifacts.model,
        ContentType: 'application/octet-stream',
      }),
    ),
    r2.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: `${prefix}/feature_schema.json`,
        Body: JSON.stringify(artifacts.featureSchema),
        ContentType: 'application/json',
      }),
    ),
    r2.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: `${prefix}/metrics.json`,
        Body: JSON.stringify(artifacts.metrics),
        ContentType: 'application/json',
      }),
    ),
  ]);

  logger.info('r2-model-storage', `Uploaded model artifacts for ${version}`);
}

/**
 * Download model ONNX file from R2.
 */
export async function downloadModel(version: string): Promise<Buffer> {
  validateVersion(version);
  const r2 = await getR2();
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET,
    Key: `models/matching/${version}/model.onnx`,
  });

  const response = await r2.send(command);
  if (!response.Body) throw new Error(`Empty response for model ${version}`);

  const chunks: Uint8Array[] = [];
  for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

/**
 * Download feature schema from R2.
 */
export async function downloadFeatureSchema(version: string): Promise<string[]> {
  validateVersion(version);
  const r2 = await getR2();
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET,
    Key: `models/matching/${version}/feature_schema.json`,
  });

  const response = await r2.send(command);
  if (!response.Body) throw new Error(`Empty response for feature schema ${version}`);
  const text = await response.Body.transformToString();
  return featureSchemaValidator.parse(JSON.parse(text));
}

/**
 * Download metrics from R2.
 */
export async function downloadMetrics(version: string): Promise<ModelArtifacts['metrics']> {
  validateVersion(version);
  const r2 = await getR2();
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET,
    Key: `models/matching/${version}/metrics.json`,
  });

  const response = await r2.send(command);
  if (!response.Body) throw new Error(`Empty response for metrics ${version}`);
  const text = await response.Body.transformToString();
  return metricsValidator.parse(JSON.parse(text));
}
