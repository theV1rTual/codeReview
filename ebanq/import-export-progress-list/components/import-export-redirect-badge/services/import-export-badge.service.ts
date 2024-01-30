import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { UnsubscribeDestroyHelper } from '@helpers/unsubscribe-destroy.helper';
import { takeUntil } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ImportExportBadgeService extends UnsubscribeDestroyHelper {

  private badgeSubject$: Subject<boolean> = new Subject<boolean>();
  public badgeObs$: Observable<boolean> = this.badgeSubject$.asObservable();
  private badgeTimer;
  private queryParams: any = {};
  private reportsData: any = {};
  validateDefaultParams = false;
  importExport = '';
  public isBadgeShown = false;

  constructor() {
    super();
    this.badgeUpdateListener();
  }

  public showBadge(value ?: string): void {
    this.importExport = value;
    this.badgeSubject$.next(true);
    this.isBadgeShown = true;
  }

  public hideBadge(): void {
    this.isBadgeShown = false;
    // this.badgeSubject$.next(false);
  }

  private badgeUpdateListener(): void {
    this.badgeSubject$.pipe(
      takeUntil(this.unsubscribeSubject)
    ).subscribe((value: boolean) => {
      this.checkTimerOnValue(value);
    });
  }

  private checkTimerOnValue(isBadgeShown: boolean): void {
    if (this.badgeTimer) {
      clearTimeout(this.badgeTimer);
    }
    if (isBadgeShown) {
      this.setBadgeTimer();
    }
  }

  private setBadgeTimer(): void {
    this.badgeTimer = setTimeout(() => {
      this.hideBadge();
    }, 60000);
  }

  setQueryParams(params: any) {
    this.queryParams = params;
  }

  getQueryParams() {
    return this.queryParams;
  }

  reportsDataService(data: any) {
    this.reportsData = data;
  }

  getReportsData() {
    return this.reportsData;
  }

  queryValidator(value?: boolean) {
    this.validateDefaultParams = value;
  }
}
