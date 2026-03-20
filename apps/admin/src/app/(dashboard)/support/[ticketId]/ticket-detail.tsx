'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';
import { StatusBadge } from '@/components/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { handleError } from '@/lib/error-handler';
import { formatDateTime } from '@/lib/formatters';
import { cn, translateDynamic } from '@/lib/utils';
import type { TicketDetail as TicketDetailType, TicketMessage } from './actions';
import {
  assignTicketAction,
  changeTicketStatus,
  fetchTicketMessages,
  replyToTicket,
} from './actions';

interface TicketDetailProps {
  ticket: TicketDetailType;
  initialMessages: TicketMessage[];
}

function MessageBubble({
  message,
  t,
}: {
  message: TicketMessage;
  t: ReturnType<typeof useTranslations<'support.detail'>>;
}) {
  const isAdmin = message.senderType === 'admin';
  const isSystem = message.senderType === 'system';
  const isInternal = message.isInternal;

  return (
    <div
      className={cn(
        'rounded-lg px-4 py-3 max-w-[80%]',
        isInternal && 'border-2 border-amber-300 bg-amber-50',
        isSystem && 'mx-auto max-w-full bg-neutral-100 text-center text-neutral-500 text-sm',
        !(isInternal || isSystem) && isAdmin && 'ml-auto bg-primary-50 border border-primary-200',
        !(isInternal || isSystem || isAdmin) && 'mr-auto bg-white border border-neutral-200',
      )}
    >
      <div className="mb-1 flex items-center gap-2">
        <span className="text-xs font-semibold text-neutral-700">
          {isSystem
            ? t('systemMessage')
            : isInternal
              ? t('internalNote')
              : (message.senderName ?? message.senderType)}
        </span>
        <span className="text-xs text-neutral-400">{formatDateTime(message.createdAt)}</span>
        {isInternal ? (
          <Badge variant="warning" className="text-xs">
            {t('internalNote')}
          </Badge>
        ) : null}
      </div>
      <p className="whitespace-pre-wrap text-sm">{message.content}</p>
    </div>
  );
}

export function TicketDetail({ ticket, initialMessages }: TicketDetailProps) {
  const t = useTranslations('support');
  const td = useTranslations('support.detail');
  const router = useRouter();
  const [messages, setMessages] = useState<TicketMessage[]>(initialMessages);
  const [replyContent, setReplyContent] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(ticket.status);
  const [isStatusUpdating, setIsStatusUpdating] = useState(false);

  async function handleReply() {
    if (!replyContent.trim()) return;
    setIsSending(true);
    try {
      await replyToTicket(ticket.id, replyContent.trim(), isInternal);
      toast.success(t('toast.replySent'));
      setReplyContent('');
      setIsInternal(false);
      const updatedMessages = await fetchTicketMessages(ticket.id);
      setMessages(updatedMessages);
    } catch (error) {
      toast.error(handleError(error, t('toast.replyError')));
    } finally {
      setIsSending(false);
    }
  }

  async function handleStatusChange(status: 'open' | 'in_progress' | 'resolved' | 'closed') {
    setIsStatusUpdating(true);
    try {
      await changeTicketStatus(ticket.id, status);
      setCurrentStatus(status);
      toast.success(t('toast.statusUpdated'));
      const updatedMessages = await fetchTicketMessages(ticket.id);
      setMessages(updatedMessages);
    } catch (error) {
      toast.error(handleError(error, t('toast.statusUpdateError')));
    } finally {
      setIsStatusUpdating(false);
    }
  }

  async function handleRemoveAssignment() {
    try {
      await assignTicketAction(ticket.id, null);
      toast.success(t('toast.assigned'));
      router.refresh();
    } catch (error) {
      toast.error(handleError(error, t('toast.assignError')));
    }
  }

  // Contextual status action buttons
  const statusActions: {
    label: string;
    status: 'open' | 'in_progress' | 'resolved' | 'closed';
  }[] = [];
  if (currentStatus === 'open') {
    statusActions.push({ label: td('actions.markInProgress'), status: 'in_progress' });
    statusActions.push({ label: td('actions.resolve'), status: 'resolved' });
    statusActions.push({ label: td('actions.close'), status: 'closed' });
  } else if (currentStatus === 'in_progress') {
    statusActions.push({ label: td('actions.resolve'), status: 'resolved' });
    statusActions.push({ label: td('actions.close'), status: 'closed' });
  } else if (currentStatus === 'resolved') {
    statusActions.push({ label: td('actions.reopen'), status: 'open' });
    statusActions.push({ label: td('actions.close'), status: 'closed' });
  } else if (currentStatus === 'closed') {
    statusActions.push({ label: td('actions.reopen'), status: 'open' });
  }

  return (
    <>
      {/* Back link */}
      <div>
        <Link href="/support" className="text-sm text-neutral-500 hover:text-neutral-700">
          &larr; {td('backToList')}
        </Link>
      </div>

      {/* Ticket metadata card */}
      <Card>
        <CardHeader>
          <CardTitle>{td('ticketInfo')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <div>
              <p className="text-xs font-medium text-neutral-500">{td('subject')}</p>
              <p className="text-sm font-semibold">{ticket.subject}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-neutral-500">{td('category')}</p>
              <Badge variant="outline">{translateDynamic(t, 'categories', ticket.category)}</Badge>
            </div>
            <div>
              <p className="text-xs font-medium text-neutral-500">{td('status')}</p>
              <StatusBadge status={currentStatus} type="support" />
            </div>
            <div>
              <p className="text-xs font-medium text-neutral-500">{td('createdAt')}</p>
              <p className="text-sm">{formatDateTime(ticket.createdAt)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-neutral-500">
                {ticket.userId ? td('user') : td('guest')}
              </p>
              <p className="text-sm">
                {ticket.userName ?? ticket.guestName ?? '-'}
                {ticket.guestEmail ? (
                  <span className="ml-1 text-neutral-500">({ticket.guestEmail})</span>
                ) : null}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-neutral-500">{td('assignedTo')}</p>
              <div className="flex items-center gap-2">
                <p className="text-sm">{ticket.assignedAdminName ?? td('unassigned')}</p>
                {ticket.assignedTo ? (
                  <Button variant="ghost" size="sm" onClick={handleRemoveAssignment}>
                    {td('removeAssignment')}
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status action buttons */}
      {statusActions.length > 0 ? (
        <div className="flex items-center gap-2">
          {statusActions.map((action) => (
            <Button
              key={action.status}
              variant={action.status === 'resolved' ? 'default' : 'outline'}
              size="sm"
              disabled={isStatusUpdating}
              onClick={() => handleStatusChange(action.status)}
            >
              {action.label}
            </Button>
          ))}
        </div>
      ) : null}

      {/* Message thread */}
      <Card>
        <CardHeader>
          <CardTitle>{td('messageThread')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-h-[600px] overflow-y-auto p-2">
            {messages.length === 0 ? (
              <p className="text-center text-sm text-neutral-500">{t('noTickets')}</p>
            ) : (
              messages.map((message) => <MessageBubble key={message.id} message={message} t={td} />)
            )}
          </div>
        </CardContent>
      </Card>

      {/* Reply form */}
      {currentStatus === 'closed' ? null : (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <textarea
                placeholder={td('replyPlaceholder')}
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                rows={4}
                className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-y"
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="internal-note"
                    checked={isInternal}
                    onChange={(e) => setIsInternal(e.target.checked)}
                    className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                  />
                  <label htmlFor="internal-note" className="text-sm font-medium leading-none">
                    {td('internalNoteToggle')}
                  </label>
                  {isInternal ? (
                    <span className="text-xs text-amber-600">{td('internalNoteHint')}</span>
                  ) : null}
                </div>
                <Button onClick={handleReply} disabled={isSending || !replyContent.trim()}>
                  {isSending ? td('sending') : td('sendReply')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
