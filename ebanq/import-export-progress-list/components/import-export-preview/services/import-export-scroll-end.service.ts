import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

@Injectable()
export class ImportExportScrollEndService {

  public onScrollEndSubject$: Subject<void> = new Subject<void>();
  public onScrollEnd$: Observable<void> = this.onScrollEndSubject$.asObservable().pipe(
    debounceTime(500)
  );

  constructor() {
  }

  public triggerScrollEndEvent(): void {
    this.onScrollEndSubject$.next();
  }
}
