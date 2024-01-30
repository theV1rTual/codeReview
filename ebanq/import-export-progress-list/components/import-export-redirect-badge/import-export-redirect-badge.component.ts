import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';
import { UnsubscribeDestroyHelper } from '@helpers/unsubscribe-destroy.helper';
import { ImportExportBadgeService } from '@lib/modules/import-export-progress-list/components/import-export-redirect-badge/services/import-export-badge.service';
import { take, takeUntil } from 'rxjs/operators';
import { ImportExportListService } from '../../services/import-export-list.service';
import { BehaviorSubject } from 'rxjs';
import { ErrorMessageTranslationService } from '@services/translate/errorMessageTranslation.service';
import { NotificationsService } from 'angular2-notifications';

@Component({
  selector: 'app-import-export-redirect-badge',
  templateUrl: './import-export-redirect-badge.component.html',
  styleUrls: ['./import-export-redirect-badge.component.scss']
})
export class ImportExportRedirectBadgeComponent extends UnsubscribeDestroyHelper {

  @Input() activeProcessAmount: number;
  private importExportListSubject: BehaviorSubject<number> = new BehaviorSubject<number>(0);

  importExportList: number;

  badgeLabel = 'importExport.Import/Export Operations {{n}} job(s) in queue';

  constructor(
    private router: Router,
    public importExportBadgeService: ImportExportBadgeService,
    private ImportExportListApiService: ImportExportListService,
    private translateService: ErrorMessageTranslationService,
    private notificationService: NotificationsService
  ) {
    super();
    this.subscribeToBadgeService();
  }

  private async getList(value) {
    let counter = 3; // Reset the counter for each method call

    while (counter > 0) {
      try {
        const res = await this.ImportExportListApiService.loadImportExportLength(value).toPromise();
        this.importExportList = res.data.pending;

        if (this.importExportList === 0) {
          counter--;

          if (counter === 0) {
            this.notificationService.error(this.translateService.translateText('error messages.Something went wrong. Please try again. Should the problem persist, please contact the administrator.'));
          } else {
            // Introduce a delay before the next iteration
            await new Promise(resolve => setTimeout(resolve, 1000)); // 1000 milliseconds delay
          }
        } else {
          // Notify subscribers as before
          this.importExportListSubject.next(this.importExportList);
          this.importExportBadgeService.isBadgeShown = this.importExportListSubject.getValue() !== 0;
          setTimeout(() => {
            this.importExportBadgeService.isBadgeShown = false;
          }, 60000);
          // Break out of the loop if the condition is met
          break;
        }
      } catch (error) {
        // Handle error
        console.error('Error occurred:', error);
        counter--;
      }
    }
  }

  getImportExportListObservable() {
    return this.importExportListSubject.asObservable().pipe(take(1));
  }

  transformLabelName(string): string {
    let transformedString = string;
    const index = transformedString.indexOf('{');
    transformedString = transformedString.substring(index);

    this.getImportExportListObservable().subscribe(importExportList => {
      transformedString = transformedString.replace('{{n}}', importExportList);
    });

    return transformedString;
  }

  public redirectOnBadge(): void {
    this.importExportBadgeService.isBadgeShown = false;
    this.router.navigate(['/import-export-list']);
  }

  private subscribeToBadgeService(): void {
    this.importExportBadgeService.badgeObs$.pipe(
      takeUntil(this.unsubscribeSubject)
    ).subscribe(() => {
      this.getList(this.importExportBadgeService.importExport);
    });
  }

}
