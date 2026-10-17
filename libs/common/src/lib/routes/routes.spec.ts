import '@angular/localize/init';

import { internalRoutes } from './routes';

describe('internalRoutes', () => {
  describe('adminControl > marketData', () => {
    const { marketData } = internalRoutes.adminControl.subRoutes;

    it('should build the asset profile dialog link from path segments without an update suffix', () => {
      expect(marketData.subRoutes.update.routerLink('YAHOO', 'AAPL')).toEqual([
        '/admin',
        'market-data',
        'YAHOO',
        'AAPL'
      ]);
    });

    it('should not append the update suffix to the asset profile dialog link', () => {
      const routerLink = marketData.subRoutes.update.routerLink(
        'YAHOO',
        'AAPL'
      );

      expect(routerLink).not.toContain('update');
    });

    it('should define the asset profile dialog route path with dataSource and symbol parameters only', () => {
      expect(marketData.subRoutes.update.path).toBe(':dataSource/:symbol');
    });

    it('should keep the create asset profile dialog link', () => {
      expect(marketData.subRoutes.create.routerLink).toEqual([
        '/admin',
        'market-data',
        'create'
      ]);
    });
  });
});
