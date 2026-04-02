import process from 'node:process';
import { ContainerInstanceManagementClient } from '@azure/arm-containerinstance';
import { DefaultAzureCredential } from '@azure/identity';
import { logger } from '@pawmeet/utils';
import { Worker } from 'bullmq';
import { getRedisConnection, moveToAnalyticsDlq, QUEUE_NAMES } from './queues/index.js';

const RESOURCE_GROUP = process.env.AZURE_RESOURCE_GROUP ?? 'rg-pawmeet-prod';
const ACR_SERVER = process.env.ACR_SERVER ?? 'crpawmeetprod.azurecr.io';
const LOCATION = process.env.AZURE_LOCATION ?? 'westeurope';
const TRAINING_IMAGE = `${ACR_SERVER}/pawmeet-ml-training:latest`;
const IDENTITY_NAME = process.env.AZURE_ACR_IDENTITY_NAME ?? 'id-pawmeet-api-prod';

function getAcrIdentityResourceId(subscriptionId: string): string {
  return `/subscriptions/${subscriptionId}/resourceGroups/${RESOURCE_GROUP}/providers/Microsoft.ManagedIdentity/userAssignedIdentities/${IDENTITY_NAME}`;
}

/**
 * BullMQ worker that triggers weekly ML model training by spawning
 * an Azure Container Instance (ACI) with the Python training image.
 *
 * The ACI container:
 * - Pulls training data from Neon PostgreSQL
 * - Trains a LightGBM model and exports to ONNX
 * - Uploads artifacts to Cloudflare R2
 * - Registers the new model version in ml_model_registry
 * - Auto-restarts: never (one-shot execution)
 *
 * Scheduled every Sunday at 03:00 UTC via BullMQ repeatable job.
 */
export function createMlTrainingWorker() {
  const worker = new Worker(
    QUEUE_NAMES.ML_TRAINING,
    async (job) => {
      const containerGroupName = `aci-pawmeet-ml-training-${Date.now()}`;

      logger.info('ml-training', `Spawning ACI container group: ${containerGroupName}`);

      const subscriptionId = process.env.AZURE_SUBSCRIPTION_ID;
      if (!subscriptionId) {
        throw new Error('AZURE_SUBSCRIPTION_ID is required to spawn ACI training jobs');
      }

      const identityId = getAcrIdentityResourceId(subscriptionId);
      const credential = new DefaultAzureCredential();
      const client = new ContainerInstanceManagementClient(credential, subscriptionId);

      await client.containerGroups.beginCreateOrUpdateAndWait(RESOURCE_GROUP, containerGroupName, {
        location: LOCATION,
        osType: 'Linux',
        restartPolicy: 'Never',
        identity: {
          type: 'UserAssigned',
          userAssignedIdentities: { [identityId]: {} },
        },
        containers: [
          {
            name: 'ml-training',
            image: TRAINING_IMAGE,
            resources: { requests: { cpu: 2, memoryInGB: 4 } },
            environmentVariables: [
              { name: 'DATABASE_URL', secureValue: process.env.DATABASE_URL },
              { name: 'R2_ENDPOINT', value: process.env.R2_ENDPOINT },
              { name: 'R2_ACCESS_KEY_ID', secureValue: process.env.R2_ACCESS_KEY_ID },
              { name: 'R2_SECRET_ACCESS_KEY', secureValue: process.env.R2_SECRET_ACCESS_KEY },
            ],
          },
        ],
        imageRegistryCredentials: [
          {
            server: ACR_SERVER,
            identity: identityId,
          },
        ],
        tags: {
          project: 'pawmeet',
          purpose: 'ml-training',
          jobId: job.id ?? 'unknown',
        },
      });

      logger.info(
        'ml-training',
        `ACI container group ${containerGroupName} created successfully — training in progress`,
      );
    },
    { connection: getRedisConnection(), concurrency: 1 },
  );

  worker.on('completed', (job) => {
    logger.info('ml-training', `Training trigger job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    logger.error('ml-training', `Training trigger job ${job?.id} failed: ${err.message}`);

    const maxAttempts = job?.opts?.attempts ?? 2;
    if (job && job.attemptsMade >= maxAttempts) {
      moveToAnalyticsDlq('ml-training', job.data, err.message).catch((dlqErr) => {
        logger.error('ml-training', `Failed to move job ${job.id} to DLQ: ${dlqErr}`);
      });
    }
  });

  return worker;
}
