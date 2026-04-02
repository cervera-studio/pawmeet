import { DOG_SIZE } from '@pawmeet/config';
import { AppError, fail, type Result, succeed } from '@pawmeet/types';
import type {
  DogPhotoAnalysisResult,
  DogPhotoAnalysisService,
} from '../ports/dog-photo-analysis-service.js';

type Deps = {
  dogPhotoAnalysisService?: DogPhotoAnalysisService;
};

export function createAnalyzeDogPhoto({ dogPhotoAnalysisService }: Deps) {
  return async (
    imageBase64: string,
    mimeType: string,
  ): Promise<Result<{ analysis: DogPhotoAnalysisResult }>> => {
    if (!dogPhotoAnalysisService) {
      return succeed({
        analysis: {
          breed: 'unknown',
          size: DOG_SIZE.MEDIUM,
          confidence: 0,
        },
      });
    }

    const analysis = await dogPhotoAnalysisService.analyze(imageBase64, mimeType);

    if (!analysis) {
      return fail(
        new AppError(
          'PHOTO_ANALYSIS_FAILED',
          'Photo analysis failed. Make sure the image contains a dog.',
          422,
        ),
      );
    }

    return succeed({ analysis });
  };
}
