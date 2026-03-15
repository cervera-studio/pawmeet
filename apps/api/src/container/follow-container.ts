// Follow domain: follow, unfollow, block, search users

import { createBlockUser } from '../use-cases/block-user.js';
import { createFollowUser } from '../use-cases/follow-user.js';
import { createGetFollowStatus } from '../use-cases/get-follow-status.js';
import { createListBlocked } from '../use-cases/list-blocked.js';
import { createListFollowers } from '../use-cases/list-followers.js';
import { createListFollowing } from '../use-cases/list-following.js';
import { createListFriends } from '../use-cases/list-friends.js';
import { createSearchUsers } from '../use-cases/search-users.js';
import { createUnblockUser } from '../use-cases/unblock-user.js';
import { createUnfollowUser } from '../use-cases/unfollow-user.js';
import { followRepo, notificationService, userRepo } from './services.js';

export const followDeps = {
  getFollowStatus: createGetFollowStatus({ followRepo }),
  followUser: createFollowUser({ followRepo, userRepo, notificationService }),
  unfollowUser: createUnfollowUser({ followRepo }),
  listFollowers: createListFollowers({ followRepo }),
  listFollowing: createListFollowing({ followRepo }),
  listFriends: createListFriends({ followRepo }),
  blockUser: createBlockUser({ followRepo, userRepo }),
  unblockUser: createUnblockUser({ followRepo }),
  listBlocked: createListBlocked({ followRepo }),
  searchUsers: createSearchUsers({ userRepo, followRepo }),
};
