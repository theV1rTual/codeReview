import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
import { ImportExportItemModel } from '@lib/modules/import-export-progress-list/models/import-export-item-model';
import { FormBuilder, FormGroup } from '@angular/forms';
import { PaginationPageLimitInterface } from '@interfaces/pagination-page-limit.interface';
import { Observable, Subject, timer } from 'rxjs';
import { SelectItemInterface } from '@interfaces/selectItemInterface';
import { ActivatedRoute, Router } from '@angular/router';
import {
  ImportExportListRequestFilter,
  ImportExportListService
} from '@lib/modules/import-export-progress-list/services/import-export-list.service';
import { debounceTime, first, takeUntil, tap } from 'rxjs/operators';
import { DEFAULT_DEBOUNCE_TIME } from '@constants/forms';
import {
  IMPORT_EXPORT_STATUS_MAP,
  IMPORT_EXPORT_STATUSES,
  IMPORT_EXPORT_TYPES,
  IMPORT_EXPORT_TYPES_DATA_MAP
} from '@lib/modules/import-export-progress-list/constants/import-export-types';
import { WebSocketService } from '@services/web-sockets';
import { WebSocketEvents } from '@services/web-sockets/events/web-socket.events';
import { UnsubscribeDestroyHelper } from '@helpers/unsubscribe-destroy.helper';
import { CustomDatePipe } from '@pipes/customDate.pipe';
import { TranslateService } from '@ngx-translate/core';
import { setToFirstPageOnChangeFilters } from '@lib/core/helpers/setToFirstPageOnChangeFilters.operator';
import { AuthService } from '@lib/core/services/auth/auth.service';
import { NgxSpinnerService } from 'ngx-spinner';

export interface ImportExportStatusInterface {
  itemId: number;
  status: string;
  progress: string;
  createdAt: string;
}

@Component({
  selector: 'app-import-export-table',
  templateUrl: './import-export-table.component.html',
  styleUrls: ['./import-export-table.component.scss']
})

export class ImportExportTableComponent extends UnsubscribeDestroyHelper implements OnInit, OnDestroy, AfterViewInit {

  public importExportList: ImportExportItemModel[];
  public form: FormGroup;
  public pagination: PaginationPageLimitInterface;
  public statuses: SelectItemInterface[] = IMPORT_EXPORT_STATUSES;
  public types: SelectItemInterface[] = IMPORT_EXPORT_TYPES;
  public typesDataMap: { [key: string]: SelectItemInterface } = IMPORT_EXPORT_TYPES_DATA_MAP;
  public importExportStatusMap: { [key: string]: { key: string, value: string } } = IMPORT_EXPORT_STATUS_MAP;
  public showPreview = false;
  public selectedPreviewItemId: number = null;
  public previewModalTitle = '';
  public errorMessage = {};
  protected unsubscribeSubject = new Subject();
  everyTenSeconds: Observable<number> = timer(0, 10000);
  labelForJobs = this.translate.instant('importExport.All Job Types');
  labelForStatuses = this.translate.instant('importExport.All Statuses');
  isDownloading = false;
  showSpinner = false;

  constructor(
    private formBuilder: FormBuilder,
    private importExportListService: ImportExportListService,
    private activatedRoute: ActivatedRoute,
    private datePipe: CustomDatePipe,
    private webSocketService: WebSocketService,
    private router: Router,
    private translate: TranslateService,
    private authService: AuthService,
    private spinner: NgxSpinnerService
  ) {
    super();
    this.form = formBuilder.group({
      sort: ''
    });
    this.authService.wsUpdateOnLogIn(true);
    this.setUpEvents();
    this.translateTypes();
    this.translateStatuses();
  }

  ngOnInit() {
    this.spinner.show();
    this.subscribeToImportExportList();
    this.everyTenSeconds
      .pipe(
        takeUntil(this.unsubscribeSubject),
      ).subscribe(() => {
        this.importExportListService.loadImportExportListSubject$.next(this.form.value);
    });
  }

  translateTypes() {
    this.types = this.types.map(({ key, value }) =>
      ({ key, value: this.translate.instant(`importExport.${value}`) }));
  }

  translateStatuses() {
    this.statuses = this.statuses.map(({ key, value }) => {
      return{ key, value: this.translate.instant(`importExport.${value}`) };
    });
  }

  ngAfterViewInit(): void {
    this.subscribeToFormChanges();
    setTimeout(() => this.form.patchValue(
      { sort: 'createdAt', ...this.activatedRoute.snapshot.queryParams }),
      0);
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }

  public onPreview(tableItem: ImportExportItemModel): void {
    this.previewModalTitle = tableItem.actionTitle + ' / ' +
      `${ this.datePipe.transform(tableItem.createdAt) } / ` +
      `${ tableItem.type === this.typesDataMap.csvImport.key ?
        this.translate.instant(`importExport.${this.typesDataMap.csvImport.value}`) :
        this.translate.instant(`importExport.${this.typesDataMap.csvExport.value}`)}`;
    this.selectedPreviewItemId = tableItem.id;
    this.showPreview = true;
    this.errorFailedMessage(tableItem);
  }

  public errorFailedMessage(data) {
    this.errorMessage = { status: data.status, message: data.message };
  }

  public onDownload(tableItem: ImportExportItemModel): void {
    this.showSpinner = true;
    if (tableItem.status === 'Failed' || tableItem.status === 'Failed_1') {
      this.importExportListService
        .downloadImportExportErrorNote(tableItem, tableItem.createdAt);
      this.showSpinner = false;
    } else {
      this.importExportListService
        .downloadImportExportNote(tableItem.id)
        .subscribe(
          (value) => {
            this.saveBlobAsFile(value.blob, value.fileName);
          },
          (error) => {
            console.error('Error downloading export result:', error);
          }
        ).add(() => {
          this.showSpinner = false;
      });
    }
  }

  private saveBlobAsFile(blob: Blob, fileName: string) {
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  public onPreviewCancel(): void {
    this.selectedPreviewItemId = null;
    this.showPreview = false;
  }

  private setUpEvents(): void {
    let isEventSet = false;
    const eventCloseSource$ = this.webSocketService.status.pipe(
      first(value => !value)
    );
    this.webSocketService.status.pipe(
      takeUntil(this.unsubscribeSubject)
    ).subscribe((status) => {
      if (status && !isEventSet) {
        this.subscribeOnWsImportExportStatusUpdate(eventCloseSource$);
        isEventSet = true;
      } else if (!status) {
        isEventSet = false;
      }
    });
  }

  private subscribeOnWsImportExportStatusUpdate(eventCloseObs$: Observable<boolean>): void {
    this.webSocketService.on<null>(WebSocketEvents.ON.IMPORT_EXPORT_STATUS).pipe(
      takeUntil(eventCloseObs$)
    ).subscribe((data: ImportExportStatusInterface) => {
      const itemIndex = this.importExportList.findIndex(
        (queueItem: ImportExportItemModel) => queueItem.id === data.itemId
      );
      if (itemIndex > 0) {
        this.importExportList[itemIndex].progress = data.progress;
        this.importExportList[itemIndex].status = data.status;
        this.importExportList[itemIndex].createdAt = data.createdAt;
      }
    });
  }

  private subscribeToImportExportList(): void {
    this.importExportListService.onLoadImportExportList$
      .pipe(
        takeUntil(this.unsubscribeSubject)
      ).subscribe(({ importExportList, pagination }:
                     { importExportList: ImportExportItemModel[], pagination: PaginationPageLimitInterface }) => {
      this.importExportList = [...importExportList];
      if (!this.importExportList.length) {
        setTimeout(() => {
          this.spinner.hide();
        }, 2000);
      } else {
        this.pagination = pagination;
        this.importExportList.map(items => {
          items['showDownload'] = false;
          items['showPreview'] = false;
          if (items.status === 'finished' || items.status === 'failed') {
            items['showDownload'] = true;
            items['showPreview'] = true;
          }
          if (items.status === 'failed') {
            items['status'] = 'Failed';
            items['statusClass'] = 'status_canceled';
          }
          if (items.status === 'finished') {
            items['status'] = 'Completed';
            items['statusClass'] = 'status_executed';
          }
          if (items.status === 'in_progress' ) {
            items['status'] = 'in_progress';
          }
          if (items.status === 'pending') {
            items['statusClass'] = 'status_pending';
          }
          items.status = this.translate.instant('importExport.' +  items.status);
          setTimeout(() => {
            this.spinner.hide();
          }, 2000);
        });
      }

    });
  }

  private subscribeToFormChanges(): void {
    this.form.valueChanges.pipe(
      tap(() => this.spinner.show()),
      debounceTime(DEFAULT_DEBOUNCE_TIME),
      setToFirstPageOnChangeFilters(this.form),
      takeUntil(this.unsubscribeSubject),
    ).subscribe((value: ImportExportListRequestFilter) => {
      this.router.navigate(['.'],
        { queryParams: value, relativeTo: this.activatedRoute }
      );
      this.importExportListService.loadImportExportListSubject$.next(value);
      setTimeout(() => {
        this.spinner.hide();
      }, 2000);
    });
  }
}
