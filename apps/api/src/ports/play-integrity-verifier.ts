export interface IntegrityVerdict {
  requestDetails: {
    requestPackageName: string;
    requestHash: string;
    timestampMillis: string;
  };
  appIntegrity: {
    appRecognitionVerdict: string;
    packageName: string;
    certificateSha256Digest: string[];
    versionCode: string;
  };
  deviceIntegrity: {
    deviceRecognitionVerdict: string[];
  };
  accountDetails: {
    appLicensingVerdict: string;
  };
}

export interface PlayIntegrityVerifier {
  verify(integrityToken: string): Promise<IntegrityVerdict>;
}
