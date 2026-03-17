import { AppError, fail, type Result, succeed } from '@pawmeet/types';
import type { AdminDataRepository } from '../../ports/admin-data-repository.js';

type Deps = {
  adminDataRepo: Pick<AdminDataRepository, 'findReportById' | 'resolveReport' | 'deactivateUser'>;
};

interface ResolveContentReportInput {
  reportId: string;
  action: 'dismiss' | 'warn' | 'suspend' | 'ban';
  adminId: string;
}

interface ResolveContentReportOutput {
  newStatus: string;
  reportedUserId: string;
}

export function createResolveContentReport({ adminDataRepo }: Deps) {
  return async (input: ResolveContentReportInput): Promise<Result<ResolveContentReportOutput>> => {
    const report = await adminDataRepo.findReportById(input.reportId);
    if (!report) {
      return fail(new AppError('REPORT_NOT_FOUND', 'Report not found', 404));
    }

    if (report.status !== 'pending') {
      return fail(new AppError('REPORT_ALREADY_RESOLVED', 'Report already resolved', 400));
    }

    const newStatus = input.action === 'dismiss' ? 'dismissed' : 'resolved';
    await adminDataRepo.resolveReport(input.reportId, newStatus, input.adminId, input.action);

    if (input.action === 'suspend' || input.action === 'ban') {
      await adminDataRepo.deactivateUser(report.reportedUserId);
    }

    return succeed({ newStatus, reportedUserId: report.reportedUserId });
  };
}
