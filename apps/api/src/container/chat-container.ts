// Chat domain: direct messages and group conversations

import { createGetGroupMessages } from '../use-cases/get-group-messages.js';
import { createGetMessages } from '../use-cases/get-messages.js';
import { createListConversations } from '../use-cases/list-conversations.js';
import { createListGroupConversations } from '../use-cases/list-group-conversations.js';
import { createMarkGroupMessagesRead } from '../use-cases/mark-group-messages-read.js';
import { createMarkMessagesRead } from '../use-cases/mark-messages-read.js';
import { createSendGroupMessage } from '../use-cases/send-group-message.js';
import { createSendMessage } from '../use-cases/send-message.js';
import {
  chat,
  dogRepo,
  groupMessageRepo,
  matchRepo,
  messageRepo,
  notificationService,
  userRepo,
} from './services.js';

export const chatDeps = {
  listConversations: createListConversations({ dogRepo, messageRepo, chat }),
  getMessages: createGetMessages({ messageRepo, chat }),
  sendMessage: createSendMessage({ messageRepo, matchRepo, chat, userRepo, notificationService }),
  markMessagesRead: createMarkMessagesRead({ messageRepo, chat }),
};

export const groupChatDeps = {
  listGroupConversations: createListGroupConversations({ groupMessageRepo, chat }),
  getGroupMessages: createGetGroupMessages({ groupMessageRepo, chat }),
  sendGroupMessage: createSendGroupMessage({
    groupMessageRepo,
    chat,
    userRepo,
    notificationService,
  }),
  markGroupMessagesRead: createMarkGroupMessagesRead({ groupMessageRepo, chat }),
};
