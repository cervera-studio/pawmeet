// Dog domain: CRUD, photos, breeds

import { createConfirmDogPhoto } from '../use-cases/confirm-dog-photo.js';
import { createCreateDog } from '../use-cases/create-dog.js';
import { createDeleteDog } from '../use-cases/delete-dog.js';
import { createDeleteDogPhoto } from '../use-cases/delete-dog-photo.js';
import { createGetDog } from '../use-cases/get-dog.js';
import { createListUserDogs } from '../use-cases/list-user-dogs.js';
import { createReorderDogPhotos } from '../use-cases/reorder-dog-photos.js';
import { createSearchBreeds } from '../use-cases/search-breeds.js';
import { createUpdateDog } from '../use-cases/update-dog.js';
import { createUploadDogPhotoUrl } from '../use-cases/upload-dog-photo-url.js';
import { breedRepo, dogRepo, storage } from './services.js';

export const dogDeps = {
  searchBreeds: createSearchBreeds({ breedRepo }),
  listUserDogs: createListUserDogs({ dogRepo }),
  createDog: createCreateDog({ dogRepo }),
  getDog: createGetDog({ dogRepo }),
  updateDog: createUpdateDog({ dogRepo }),
  deleteDog: createDeleteDog({ dogRepo }),
  uploadDogPhotoUrl: createUploadDogPhotoUrl({ dogRepo, storage }),
  confirmDogPhoto: createConfirmDogPhoto({ dogRepo, storage }),
  deleteDogPhoto: createDeleteDogPhoto({ dogRepo, storage }),
  reorderDogPhotos: createReorderDogPhotos({ dogRepo }),
};
