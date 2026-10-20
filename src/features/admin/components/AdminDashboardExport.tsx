import type { ReactElement } from 'react';
import type { FinanceMonthlyDashboard, ProductionCurrentStockSection, ProductionOverview, ReportSummary, SalesAnalytics } from '@/api/types';
import { dayLabel, karachiTime, type FinanceGranularity } from '@/features/finance';
import type { AppHeaderAction } from '@/shared/ui';
import { adminDashboardCsv, adminDashboardCsvName, adminDashboardPrintText } from '../utils/exports';
import { shareText, useExportSheet } from './ExportSheet';

/**
 * The Admin Dashboard's Print and Export CSV (the web heading's two buttons)
 * as one header button opening a small sheet. Print needs the month's
 * figures; Export CSV also needs the month not to be empty — as on the web.
 */
export function useAdminDashboardExport(p: {
  data: FinanceMonthlyDashboard | undefined;
  sales: SalesAnalytics | null;
  isEmpty: boolean;
  context: string;
  month: string;
  /** The branch filter's label, or null for All Branches. */
  branchLabel: string | null;
  /** The day range, or null for the full month. */
  range: { from: number; to: number } | null;
  incGran: FinanceGranularity;
  expGran: FinanceGranularity;
  businessDate: string;
  scopeLabel: string;
  today: ReportSummary | undefined;
  production: ProductionOverview | undefined;
  stock: ProductionCurrentStockSection | undefined;
}): { action: AppHeaderAction; element: ReactElement } {
  const sheet = useExportSheet();

  const open = () => {
    const data = p.data;
    const input = data ? { context: p.context, finance: data, sales: p.sales, incGran: p.incGran, expGran: p.expGran } : null;
    sheet.open({
      title: 'Admin Dashboard',
      subtitle: p.context,
      options: [
        {
          key: 'print',
          section: 'Print',
          label: 'Print',
          icon: 'printer',
          hint: 'The dashboard as a text document — route it to a print service',
          disabled: !input,
          errorTitle: 'Could Not Print',
          run: async () =>
            input &&
            shareText(
              `Admin Dashboard — ${p.context}`,
              adminDashboardPrintText({
                ...input,
                updatedAt: karachiTime(input.finance.generatedAt),
                today: {
                  heading: `Business day ${dayLabel(p.businessDate)} ${p.businessDate.slice(0, 4)} · ${p.scopeLabel}`,
                  summary: p.today ?? null,
                  waitingOrders: p.production?.cards.waitingOrders ?? null,
                  activeBranches: p.production?.cards.totalBranches ?? null,
                  lowStock: p.stock?.kpis.low ?? null,
                },
              }),
            ),
        },
        {
          key: 'csv',
          section: 'Export',
          label: 'Export CSV',
          icon: 'file-spreadsheet',
          hint: p.isEmpty ? 'No records for this month and branch' : 'Every section, one block each',
          disabled: !input || p.isEmpty,
          run: async () => input && shareText(adminDashboardCsvName(p.month, p.branchLabel, p.range), adminDashboardCsv(input)),
        },
      ],
    });
  };

  return {
    action: { icon: 'printer', onPress: open, accessibilityLabel: 'Print or export the dashboard' },
    element: sheet.element,
  };
}
