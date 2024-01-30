import { Injectable } from '@angular/core';
import { PaginationFieldInterface } from '@interfaces/sort-bar/paginationField.interface';
import { Observable, Subject } from 'rxjs';
import { PaginationPageLimitInterface } from '@interfaces/pagination-page-limit.interface';
import { map, switchMap } from 'rxjs/operators';
import { CallResponseInterface } from '@interfaces/callResponse.interface';
import { PaginationService } from '@services/pagination/pagination.service';
import { queryParamsStringify } from '@helpers/queryParamsHelpers';
import { ImportExportItemModel } from '@lib/modules/import-export-progress-list/models/import-export-item-model';
import { ImportExportListApiService } from '@lib/modules/import-export-progress-list/services/import-export-list-api.service';
import { SortFieldInterface } from '@interfaces/sort-bar/sortField.interface';
import { TranslateService } from '@ngx-translate/core';

export type ImportExportListRequestFilter =
  & PaginationFieldInterface
  & SortFieldInterface
  & {
  type: string;
  status: string;
};

@Injectable()

export class ImportExportListService {

  public loadImportExportListSubject$: Subject<ImportExportListRequestFilter> =
    new Subject<ImportExportListRequestFilter>();

  public onLoadImportExportList$: Observable<{ importExportList: ImportExportItemModel[], pagination: PaginationPageLimitInterface }> = this
    .loadImportExportListSubject$.asObservable()
    .pipe(
      map((query: ImportExportListRequestFilter) => ImportExportListService.transformImportExportListParams(query)
      ),
      switchMap((params: { [key: string]: string }) => this.apiService.apiLoadImportExportList(params)),
      map(({ data, error }: CallResponseInterface) => {

        if (error) {
          return { importExportList: [], pagination: PaginationService.defaultPaginationPageLimit };
        }

        const importExportList = (data['data']).map((item) => new ImportExportItemModel(item));

        const pagination = PaginationService.buildPaginationSizeNumber(data['links']);
        return { importExportList, pagination };
      }));

  public loadImportExportLength(params) {
    return this.apiService.apiLoadImportExportLength(this.transformLengthParams(params)).pipe(
        map(({ data }: { data}) => {
          return { data };
      }
    ));
  }

  constructor(
    private apiService: ImportExportListApiService,
    private translate: TranslateService,
  ) {
  }

  transformLengthParams(queryParams) {
    const params = { };

    if (queryParams) {
      params['filter[type]'] = queryParams;
    }

    return queryParamsStringify(params);
  }

  private static transformImportExportListParams(queryParams: ImportExportListRequestFilter, forCsv = false):
    { [key: string]: string } {

    const params = {
      sort: queryParams.sort,
      page: {},
      filter: {}
    };

    if (!forCsv) {
      params.page['size'] = queryParams.size;
      params.page['number'] = queryParams.page;
    }

    if (queryParams.status) {
      params.filter['status'] = queryParams.status;
    }

    if (queryParams.type) {
      params.filter['type'] = queryParams.type;
    }

    return queryParamsStringify(params);
  }

  public getPreviewOnItemId(noteId: number, params: { [key: string]: number | string }): Observable<string[][]> {
    const queryParams = queryParamsStringify(queryParamsStringify({
      page: {
        number: params.number,
        size: params.size
      }
    }), false);
    return this.apiService.apiGetPreviewOnItemId(noteId, queryParams);
  }

  public downloadImportExportNote(noteId: number) {
    return this.apiService.apiDownloadImportExportNote(noteId).pipe(
      switchMap((value: ImportExportItemModel) => this.apiService.apiDirectDownload(value.link, value.filename))
    );
  }

  public downloadImportExportErrorNote(tableItem: ImportExportItemModel, created_at: string) {
    return this.apiService.apiLoadImportExportErrorReport(tableItem.id).subscribe(value => {
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(value);
      link.download = `${created_at}-${tableItem.actionTitle}-${this.translate.instant('error messages.Error')}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  }
}
