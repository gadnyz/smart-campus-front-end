import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'firstChar'
})
export class FirstCharPipe implements PipeTransform {

  transform(value: string | undefined | null): string {
    if (!value) {
      return '';
    }

    return value.charAt(0).toUpperCase();
  }
}