import { Component, Input, OnInit } from '@angular/core';
import { takeUntil } from 'rxjs/operators';
import {
  ImportExportListService
} from '@lib/modules/import-export-progress-list/services/import-export-list.service';
import { UnsubscribeDestroyHelper } from '@helpers/unsubscribe-destroy.helper';
import { FormBuilder, FormGroup } from '@angular/forms';
import { PaginationPageLimitInterface } from '@interfaces/pagination-page-limit.interface';
import { PaginationService } from '@services/pagination/pagination.service';
import { ImportExportScrollEndService } from '@lib/modules/import-export-progress-list/components/import-export-preview/services/import-export-scroll-end.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-import-export-preview-table',
  templateUrl: './import-export-preview-table.component.html',
  styleUrls: ['./import-export-preview-table.component.scss']
})
export class ImportExportPreviewTableComponent extends UnsubscribeDestroyHelper implements OnInit {

  @Input() previewItemId: number = null;
  public previewData: string[][] = [];
  public form: FormGroup;
  public pagination: PaginationPageLimitInterface;
  public showSpinner = false;

  constructor(
    private importExportListService: ImportExportListService,
    private fb: FormBuilder,
    private importExportScrollEndService: ImportExportScrollEndService,
    private translate: TranslateService,
  ) {
    super();
    this.form = fb.group({});
  }

  ngOnInit() {
    if (this.previewItemId || this.previewItemId === 0) {
      this.pagination = Object.assign({}, PaginationService.defaultPaginationPageLimit);
      this.getPreviewData();
    }
  }
  private getPreviewData(initialLoad = true): void {
    this.showSpinner = true;
    this.importExportListService.getPreviewOnItemId(
      this.previewItemId,
      {
        number: this.pagination.currentPage,
        size: this.pagination.limit
      }
    ).pipe(
      takeUntil(this.unsubscribeSubject),
    ).subscribe(
      (data: (string[])[]) => {
        if (!Array.isArray(data)) {
          return;
        }

        if (!initialLoad && data.length) {
          this.previewData.push(...data);
        } else {
          this.previewData = [...data];
          this.previewData[0] = this.previewData[0].map((value) => {
            if (value === 'Status') {
              return value; // Return value without translating
            }
            return this.translate.instant(`importExport.${value}`);
          });
        }
      },
      (error) => {
        console.error('Error in API request:', error);
        // Handle the error here, and update showSpinner accordingly
        this.showSpinner = false;
      },
      () => {
        // This block will be executed when the observable completes (either successfully or with an error)
        this.showSpinner = false;
      }
    );
  }
}
