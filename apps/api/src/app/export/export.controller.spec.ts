import { ApiService } from '@ghostfolio/api/services/api/api.service';
import type { RequestWithUser } from '@ghostfolio/common/types';

import { ExportController } from './export.controller';
import { ExportService } from './export.service';

describe('ExportController', () => {
  const otherUserAccountId = '11111111-1111-4111-8111-111111111111';

  let exportController: ExportController;
  let exportServiceExport: jest.Mock;

  beforeEach(() => {
    exportServiceExport = jest.fn().mockResolvedValue({});

    exportController = new ExportController(
      new ApiService(),
      { export: exportServiceExport } as unknown as ExportService, // ts-escape-ok: partial mock, only export is used
      {
        user: {
          id: 'user-a',
          settings: { settings: { baseCurrency: 'USD' } }
        }
      } as unknown as RequestWithUser // ts-escape-ok: partial request, only user is read
    );
  });

  it('passes the user of the request and the filters of the query to the export service', async () => {
    await exportController.export({
      accounts: [otherUserAccountId],
      dataSource: 'YAHOO',
      symbol: 'AAPL'
    } as Parameters<ExportController['export']>[0]);

    expect(exportServiceExport).toHaveBeenCalledTimes(1);
    expect(exportServiceExport).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: expect.arrayContaining([
          { id: otherUserAccountId, type: 'ACCOUNT' },
          { id: 'YAHOO', type: 'DATA_SOURCE' },
          { id: 'AAPL', type: 'SYMBOL' }
        ]),
        userId: 'user-a',
        userSettings: { baseCurrency: 'USD' }
      })
    );
  });

  it('passes the activity IDs through unchanged', async () => {
    const activityIds = [
      '22222222-2222-4222-8222-222222222222',
      '33333333-3333-4333-8333-333333333333'
    ];

    await exportController.export({
      activityIds
    } as Parameters<ExportController['export']>[0]);

    expect(exportServiceExport).toHaveBeenCalledWith(
      expect.objectContaining({ activityIds, userId: 'user-a' })
    );
  });
});
