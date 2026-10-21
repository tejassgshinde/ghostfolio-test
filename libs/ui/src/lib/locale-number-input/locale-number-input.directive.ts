import {
  formatNumberForLocaleInput,
  parseNumberFromLocaleString
} from '@ghostfolio/common/helper';

import {
  Directive,
  ElementRef,
  Renderer2,
  effect,
  forwardRef,
  inject,
  input
} from '@angular/core';
import {
  ControlValueAccessor,
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
  ValidationErrors,
  Validator
} from '@angular/forms';

// Turns a text input into a number control which reads and shows numbers in the
// number format of the given locale. The form control holds a plain
// `number | null`. Text that is not a number in that format yields `null` and
// the validation error `invalidNumber`.
@Directive({
  host: {
    '(blur)': 'onBlur()',
    '(input)': 'onInput()'
  },
  providers: [
    {
      multi: true,
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => GfLocaleNumberInputDirective)
    },
    {
      multi: true,
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => GfLocaleNumberInputDirective)
    }
  ],
  selector: 'input[gfLocaleNumberInput]'
})
export class GfLocaleNumberInputDirective
  implements ControlValueAccessor, Validator
{
  public readonly locale = input<string>();

  private hasInvalidText = false;
  private onChange: (value: number | null) => void = () => undefined;
  private onTouched: () => void = () => undefined;
  private value: number | null = null;

  private readonly elementRef =
    inject<ElementRef<HTMLInputElement>>(ElementRef);
  private readonly renderer = inject(Renderer2);

  public constructor() {
    effect(() => {
      // Show the current value in the format of a changed locale
      const locale = this.locale();

      if (!this.hasInvalidText) {
        this.render(locale);
      }
    });
  }

  public onBlur() {
    if (!this.hasInvalidText) {
      this.render();
    }

    this.onTouched();
  }

  public onInput() {
    const parsedValue = parseNumberFromLocaleString({
      locale: this.locale(),
      value: this.elementRef.nativeElement.value
    });

    this.hasInvalidText = Number.isNaN(parsedValue);
    this.value = this.hasInvalidText ? null : parsedValue;

    this.onChange(this.value);
  }

  public registerOnChange(fn: (value: number | null) => void) {
    this.onChange = fn;
  }

  public registerOnTouched(fn: () => void) {
    this.onTouched = fn;
  }

  public setDisabledState(isDisabled: boolean) {
    this.renderer.setProperty(
      this.elementRef.nativeElement,
      'disabled',
      isDisabled
    );
  }

  public validate(): ValidationErrors | null {
    return this.hasInvalidText ? { invalidNumber: true } : null;
  }

  public writeValue(value: number | null) {
    this.hasInvalidText = false;
    this.value = value ?? null;

    this.render();
  }

  private render(locale = this.locale()) {
    this.renderer.setProperty(
      this.elementRef.nativeElement,
      'value',
      formatNumberForLocaleInput({ locale, value: this.value })
    );
  }
}
