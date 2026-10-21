import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';

import { GfLocaleNumberInputDirective } from './locale-number-input.directive';

@Component({
  imports: [GfLocaleNumberInputDirective, ReactiveFormsModule],
  selector: 'gf-test-host',
  template: `<input
    type="text"
    gfLocaleNumberInput
    [formControl]="ctrl"
    [locale]="locale()"
  />`
})
class TestHostComponent {
  public ctrl = new FormControl<number | null>(null, Validators.required);
  public locale = signal('de-DE');
}

describe('GfLocaleNumberInputDirective', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;
  let input: HTMLInputElement;

  function type(text: string) {
    input.value = text;
    input.dispatchEvent(new Event('input'));
  }

  async function setup({
    locale,
    value = null
  }: {
    locale: string;
    value?: number | null;
  }) {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
    host.locale.set(locale);
    host.ctrl = new FormControl<number | null>(value, Validators.required);

    fixture.detectChanges();
    await fixture.whenStable();

    input = fixture.nativeElement.querySelector('input');
  }

  describe('Parse typed or pasted text', () => {
    it('Parse de-DE number with group and decimal separator', async () => {
      await setup({ locale: 'de-DE' });

      type('1.234,50');

      expect(host.ctrl.value).toBe(1234.5);
      expect(host.ctrl.valid).toBe(true);
      expect(host.ctrl.dirty).toBe(true);
    });

    it('Parse en-US number with group and decimal separator', async () => {
      await setup({ locale: 'en-US' });

      type('1,234.50');

      expect(host.ctrl.value).toBe(1234.5);
    });

    it('Parse ambiguous number per locale', async () => {
      await setup({ locale: 'de-DE' });

      type('1.234');

      expect(host.ctrl.value).toBe(1234);

      host.locale.set('en-US');
      fixture.detectChanges();

      type('1.234');

      expect(host.ctrl.value).toBe(1.234);
    });

    it('Parse plain decimal', async () => {
      await setup({ locale: 'de-DE' });

      type('12,5');

      expect(host.ctrl.value).toBe(12.5);

      host.locale.set('en-US');
      fixture.detectChanges();

      type('12.5');

      expect(host.ctrl.value).toBe(12.5);
    });
  });

  describe('Invalid text', () => {
    it('Mark text which is not a number as invalid', async () => {
      await setup({ locale: 'de-DE' });

      type('abc');

      expect(host.ctrl.value).toBeNull();
      expect(host.ctrl.invalid).toBe(true);
      expect(host.ctrl.errors?.invalidNumber).toBeTruthy();
      expect(input.value).toBe('abc');
    });

    it('Mark number in the format of another locale as invalid', async () => {
      await setup({ locale: 'de-DE' });

      type('1,234.50');

      expect(host.ctrl.value).toBeNull();
      expect(host.ctrl.invalid).toBe(true);
      expect(host.ctrl.errors?.invalidNumber).toBeTruthy();
      expect(input.value).toBe('1,234.50');
    });

    it('Keep invalid text as typed on blur', async () => {
      await setup({ locale: 'de-DE' });

      type('abc');
      input.dispatchEvent(new Event('blur'));

      expect(input.value).toBe('abc');
      expect(host.ctrl.errors?.invalidNumber).toBeTruthy();
    });

    it('Become valid again after correcting the text', async () => {
      await setup({ locale: 'de-DE' });

      type('abc');
      type('12,5');

      expect(host.ctrl.value).toBe(12.5);
      expect(host.ctrl.valid).toBe(true);
    });

    it('Give null and a required error for empty text', async () => {
      await setup({ locale: 'de-DE', value: 1 });

      type('');

      expect(host.ctrl.value).toBeNull();
      expect(host.ctrl.errors?.required).toBeTruthy();
      expect(host.ctrl.errors?.invalidNumber).toBeUndefined();
    });
  });

  describe('Display value', () => {
    it('Show value set programmatically in the locale without becoming dirty', async () => {
      await setup({ locale: 'de-DE' });

      host.ctrl.setValue(1234.5);

      expect(input.value).toBe('1.234,5');
      expect(host.ctrl.pristine).toBe(true);
    });

    it('Show initial value in the locale and keep it exactly', async () => {
      await setup({ locale: 'de-DE', value: 0.00001234 });

      expect(input.value).toBe('0,00001234');
      expect(host.ctrl.value).toBe(0.00001234);
      expect(host.ctrl.pristine).toBe(true);
    });

    it('Reset invalid text when the control is reset', async () => {
      await setup({ locale: 'de-DE' });

      type('abc');
      host.ctrl.reset();

      expect(input.value).toBe('');
      expect(host.ctrl.errors?.invalidNumber).toBeUndefined();
    });

    it('Format value and mark control as touched on blur', async () => {
      await setup({ locale: 'de-DE' });

      type('1234,5');

      expect(input.value).toBe('1234,5');

      input.dispatchEvent(new Event('blur'));

      expect(input.value).toBe('1.234,5');
      expect(host.ctrl.value).toBe(1234.5);
      expect(host.ctrl.touched).toBe(true);
    });

    it('Show value in the format of a changed locale', async () => {
      await setup({ locale: 'en-US', value: 1234.5 });

      expect(input.value).toBe('1,234.5');

      host.locale.set('de-DE');
      fixture.detectChanges();
      await fixture.whenStable();

      expect(input.value).toBe('1.234,5');
      expect(host.ctrl.value).toBe(1234.5);
      expect(host.ctrl.pristine).toBe(true);
    });

    it('Disable the input together with the control', async () => {
      await setup({ locale: 'de-DE' });

      host.ctrl.disable();

      expect(input.disabled).toBe(true);
    });
  });
});
