import {
  contentReports,
  emergencyContacts,
  mlTrainingSamples,
  reports,
  supportMessages,
  supportTickets,
  userConsents,
  walkFeedback,
} from '@pawmeet/db';
import { and, eq, inArray, or } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type {
  GdprContentReport,
  GdprEmergencyContact,
  GdprMlTrainingSample,
  GdprSupportTicket,
  GdprUserReport,
} from '../../ports/gdpr-export-repository.js';

export function createComplianceQueries(db: NodePgDatabase) {
  return {
    async getConsents(userId: string) {
      return db
        .select({
          consentType: userConsents.consentType,
          consentVersion: userConsents.consentVersion,
          granted: userConsents.granted,
          grantedAt: userConsents.grantedAt,
          withdrawnAt: userConsents.withdrawnAt,
          ipAddress: userConsents.ipAddress,
          userAgent: userConsents.userAgent,
          source: userConsents.source,
        })
        .from(userConsents)
        .where(eq(userConsents.userId, userId));
    },

    async getContentReports(userId: string): Promise<GdprContentReport[]> {
      return db
        .select({
          contentType: contentReports.contentType,
          contentId: contentReports.contentId,
          reason: contentReports.reason,
          description: contentReports.description,
          status: contentReports.status,
          createdAt: contentReports.createdAt,
        })
        .from(contentReports)
        .where(eq(contentReports.reporterId, userId));
    },

    async getUserReports(userId: string): Promise<GdprUserReport[]> {
      return db
        .select({
          reportedUserId: reports.reportedUserId,
          reason: reports.reason,
          description: reports.description,
          status: reports.status,
          createdAt: reports.createdAt,
        })
        .from(reports)
        .where(eq(reports.reporterId, userId));
    },

    async getEmergencyContacts(userId: string): Promise<GdprEmergencyContact[]> {
      return db
        .select({
          name: emergencyContacts.name,
          phone: emergencyContacts.phone,
          relationship: emergencyContacts.relationship,
          createdAt: emergencyContacts.createdAt,
        })
        .from(emergencyContacts)
        .where(eq(emergencyContacts.userId, userId)) as unknown as GdprEmergencyContact[];
    },

    async getFeedbackGiven(userId: string) {
      return db
        .select({
          walkId: walkFeedback.walkId,
          toDogId: walkFeedback.toDogId,
          rating: walkFeedback.rating,
          comment: walkFeedback.comment,
          createdAt: walkFeedback.createdAt,
        })
        .from(walkFeedback)
        .where(eq(walkFeedback.fromUserId, userId));
    },

    async getSupportTickets(userId: string): Promise<GdprSupportTicket[]> {
      const tickets = await db
        .select({
          id: supportTickets.id,
          subject: supportTickets.subject,
          category: supportTickets.category,
          status: supportTickets.status,
          createdAt: supportTickets.createdAt,
        })
        .from(supportTickets)
        .where(eq(supportTickets.userId, userId));

      const result: GdprSupportTicket[] = [];
      for (const t of tickets) {
        const msgs = await db
          .select({
            senderType: supportMessages.senderType,
            content: supportMessages.content,
            createdAt: supportMessages.createdAt,
          })
          .from(supportMessages)
          .where(and(eq(supportMessages.ticketId, t.id), eq(supportMessages.isInternal, false)));

        result.push({
          subject: t.subject,
          category: t.category,
          status: t.status,
          createdAt: t.createdAt,
          messages: msgs as unknown as GdprSupportTicket['messages'],
        });
      }
      return result;
    },

    async getMlTrainingSamples(dogIds: string[]): Promise<GdprMlTrainingSample[]> {
      if (dogIds.length === 0) return [];
      return db
        .select({
          matchId: mlTrainingSamples.matchId,
          outcomeLabel: mlTrainingSamples.outcomeLabel,
          labelVersion: mlTrainingSamples.labelVersion,
          maturedAt: mlTrainingSamples.maturedAt,
          createdAt: mlTrainingSamples.createdAt,
        })
        .from(mlTrainingSamples)
        .where(
          or(inArray(mlTrainingSamples.dogAId, dogIds), inArray(mlTrainingSamples.dogBId, dogIds)),
        ) as unknown as GdprMlTrainingSample[];
    },
  };
}
