import { AdminMarketDataService } from '@ghostfolio/client/components/admin-market-data/admin-market-data.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { DataSource } from '@ghostfolio/prisma/enums';
import { NotificationService } from '@ghostfolio/ui/notifications';
import { AdminService, DataService } from '@ghostfolio/ui/services';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { EMPTY, of } from 'rxjs';

import { GfAssetProfileDialogComponent } from './asset-profile-dialog.component';

const ASSET_PROFILE_ID = 'f5a8d3c2-0f3c-4a8e-9f7e-2a0b0f6d9a11';
const IDENTIFIER = { dataSource: DataSource.YAHOO, symbol: 'IWDA.AS' };

function createAssetProfile() {
  return {
    activitiesCount: 0,
    assetClass: 'EQUITY',
    assetSubClass: 'ETF',
    comment: null,
    countries: [],
    currency: 'EUR',
    dataGatheringFrequency: 'DAILY',
    id: ASSET_PROFILE_ID,
    isActive: true,
    name: 'iShares Core MSCI World UCITS ETF USD (Acc)',
    scraperConfiguration: null,
    sectors: [],
    symbol: IDENTIFIER.symbol,
    symbolMapping: {},
    url: null,
    watchedByCount: 0
  };
}

describe('GfAssetProfileDialogComponent', () => {
  let adminService: {
    fetchAdminData: jest.Mock;
    patchAssetProfile: jest.Mock;
  };
  let component: GfAssetProfileDialogComponent;
  let dataService: {
    deleteBenchmark: jest.Mock;
    fetchInfo: jest.Mock;
    fetchMarketDataBySymbol: jest.Mock;
    postBenchmark: jest.Mock;
    updateInfo: jest.Mock;
  };
  let dialogRef: { close: jest.Mock };
  let fixture: ComponentFixture<GfAssetProfileDialogComponent>;

  async function createComponent({
    benchmarks = [],
    symbol = IDENTIFIER.symbol
  }: {
    benchmarks?: { id: string }[];
    symbol?: string;
  } = {}) {
    dataService.fetchInfo.mockReturnValue({ benchmarks, currencies: [] });

    TestBed.overrideProvider(MAT_DIALOG_DATA, {
      useValue: {
        dataSource: IDENTIFIER.dataSource,
        deviceType: 'desktop',
        locale: 'en-US',
        symbol
      }
    });

    fixture = TestBed.createComponent(GfAssetProfileDialogComponent);
    component = fixture.componentInstance;

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function getBenchmarkCheckbox() {
    return fixture.debugElement
      .queryAll(By.css('mat-checkbox'))
      .find(({ nativeElement }) => {
        return (nativeElement as HTMLElement).textContent?.includes(
          'Benchmark'
        );
      });
  }

  function getBenchmarkCheckboxInput() {
    return getBenchmarkCheckbox().query(By.css('input'))
      .nativeElement as HTMLInputElement;
  }

  function getButton(label: string) {
    return fixture.debugElement
      .queryAll(By.css('button'))
      .find(({ nativeElement }) => {
        return (nativeElement as HTMLElement).textContent?.trim() === label;
      })?.nativeElement as HTMLButtonElement;
  }

  async function toggleBenchmark() {
    getBenchmarkCheckboxInput().click();

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  async function clickSave() {
    getButton('Save').click();

    /* onSubmitAssetProfileForm validates asynchronously before calling the API */
    await new Promise((resolve) => setTimeout(resolve));
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    adminService = {
      fetchAdminData: jest.fn().mockReturnValue(of({ settings: {} })),
      patchAssetProfile: jest.fn().mockReturnValue(of({}))
    };
    dataService = {
      deleteBenchmark: jest.fn().mockReturnValue(of({})),
      fetchInfo: jest.fn(),
      fetchMarketDataBySymbol: jest.fn().mockImplementation(() => {
        return of({
          assetProfile: createAssetProfile(),
          marketData: [],
          splits: []
        });
      }),
      postBenchmark: jest.fn().mockReturnValue(of({})),
      updateInfo: jest.fn()
    };
    dialogRef = { close: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [GfAssetProfileDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: AdminService, useValue: adminService },
        { provide: DataService, useValue: dataService },
        { provide: MAT_DIALOG_DATA, useValue: {} },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MatSnackBar, useValue: { open: jest.fn() } },
        {
          provide: NotificationService,
          useValue: { alert: jest.fn(), confirm: jest.fn(), prompt: jest.fn() }
        },
        { provide: UserService, useValue: { stateChanged: EMPTY } }
      ]
    })
      .overrideComponent(GfAssetProfileDialogComponent, {
        set: {
          providers: [{ provide: AdminMarketDataService, useValue: {} }]
        }
      })
      .compileComponents();

    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('enables Save and labels Close as Cancel after toggling the benchmark checkbox on', async () => {
    await createComponent();

    expect(getBenchmarkCheckboxInput().checked).toBe(false);
    expect(getButton('Save').disabled).toBe(true);
    expect(getButton('Close')).toBeTruthy();

    await toggleBenchmark();

    expect(component['assetProfileForm'].dirty).toBe(true);
    expect(getButton('Save').disabled).toBe(false);
    expect(getButton('Cancel')).toBeTruthy();
  });

  it('makes the form pristine and disables Save when toggled back to the original value', async () => {
    await createComponent();

    await toggleBenchmark();
    await toggleBenchmark();

    expect(getBenchmarkCheckboxInput().checked).toBe(false);
    expect(component['assetProfileForm'].dirty).toBe(false);
    expect(getButton('Save').disabled).toBe(true);
    expect(getButton('Close')).toBeTruthy();
  });

  it('keeps the form dirty when toggled back after another field was edited', async () => {
    await createComponent();

    await toggleBenchmark();

    component['assetProfileForm'].controls.name.setValue('Another name');
    component['assetProfileForm'].controls.name.markAsDirty();

    await toggleBenchmark();

    expect(getBenchmarkCheckboxInput().checked).toBe(false);
    expect(component['assetProfileForm'].dirty).toBe(true);

    fixture.detectChanges();

    expect(getButton('Save').disabled).toBe(false);
  });

  it('patches the asset profile and then adds the benchmark on Save', async () => {
    await createComponent();

    await toggleBenchmark();
    await clickSave();

    expect(adminService.patchAssetProfile).toHaveBeenCalledTimes(1);
    expect(dataService.postBenchmark).toHaveBeenCalledTimes(1);
    expect(dataService.postBenchmark).toHaveBeenCalledWith(IDENTIFIER);
    expect(dataService.deleteBenchmark).not.toHaveBeenCalled();
    expect(
      adminService.patchAssetProfile.mock.invocationCallOrder[0]
    ).toBeLessThan(dataService.postBenchmark.mock.invocationCallOrder[0]);

    expect(dataService.updateInfo).toHaveBeenCalled();
    expect(component['isBenchmark']).toBe(true);
    expect(component['assetProfileForm'].controls.isBenchmark.value).toBe(true);
    expect(component['assetProfileForm'].dirty).toBe(false);
    expect(getBenchmarkCheckboxInput().checked).toBe(true);
    expect(getButton('Save').disabled).toBe(true);
  });

  it('removes the benchmark on Save when a benchmark asset is toggled off', async () => {
    await createComponent({ benchmarks: [{ id: ASSET_PROFILE_ID }] });

    expect(component['isBenchmark']).toBe(true);
    expect(getBenchmarkCheckboxInput().checked).toBe(true);

    await toggleBenchmark();

    expect(getBenchmarkCheckboxInput().checked).toBe(false);
    expect(getButton('Save').disabled).toBe(false);

    await clickSave();

    expect(adminService.patchAssetProfile).toHaveBeenCalledTimes(1);
    expect(dataService.deleteBenchmark).toHaveBeenCalledTimes(1);
    expect(dataService.deleteBenchmark).toHaveBeenCalledWith(IDENTIFIER);
    expect(dataService.postBenchmark).not.toHaveBeenCalled();
    expect(component['isBenchmark']).toBe(false);
    expect(component['assetProfileForm'].controls.isBenchmark.value).toBe(
      false
    );
    expect(component['assetProfileForm'].dirty).toBe(false);
  });

  it('only patches the asset profile on Save when just another field changed', async () => {
    await createComponent();

    component['assetProfileForm'].controls.name.setValue('Another name');
    component['assetProfileForm'].controls.name.markAsDirty();
    fixture.detectChanges();

    await clickSave();

    expect(adminService.patchAssetProfile).toHaveBeenCalledTimes(1);
    expect(dataService.postBenchmark).not.toHaveBeenCalled();
    expect(dataService.deleteBenchmark).not.toHaveBeenCalled();
  });

  it('makes no benchmark call when closing after toggling', async () => {
    await createComponent();

    await toggleBenchmark();

    component['onClose']();

    expect(dialogRef.close).toHaveBeenCalledTimes(1);
    expect(adminService.patchAssetProfile).not.toHaveBeenCalled();
    expect(dataService.postBenchmark).not.toHaveBeenCalled();
    expect(dataService.deleteBenchmark).not.toHaveBeenCalled();
  });

  describe('benchmark checkbox disabled state', () => {
    it('is enabled for an editable asset profile', async () => {
      await createComponent();

      expect(getBenchmarkCheckboxInput().disabled).toBe(false);
    });

    it('is disabled for a currency symbol', async () => {
      await createComponent({ symbol: 'EURUSD' });

      expect(component['canEditAssetProfile']).toBe(false);
      expect(getBenchmarkCheckboxInput().disabled).toBe(true);
    });

    it('is disabled in identifier edit mode', async () => {
      await createComponent();

      component['isEditAssetProfileIdentifierMode'] = true;
      fixture.componentRef.changeDetectorRef.markForCheck();
      fixture.detectChanges();

      expect(getBenchmarkCheckboxInput().disabled).toBe(true);
    });
  });
});
