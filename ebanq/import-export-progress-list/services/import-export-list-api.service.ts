import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders as Headers, HttpParams } from '@angular/common/http';
import { ApiCallerService } from '@services/api-caller.service';
import { ConfigService } from '@lib/config.service';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()

export class ImportExportListApiService {

  constructor(
    private http: HttpClient,
    private apiCallerService: ApiCallerService,
    private configService: ConfigService
  ) {
  }

  public apiLoadImportExportList(params: { [key: string]: string }) {
    return this.apiCallerService.call(() => (
      this.http.get(
        this.configService.config.api.importExportList.loadQueue,
        {
          params
        }
      ).pipe(
        map(data => {
          return {
            data
          };
        })
      )
    ), 'apiLoadImportExportList');
  }

  public apiLoadImportExportLength(params: { [key: string]: string }) {

    return this.apiCallerService.call(() => (
      this.http.get(
        this.configService.config.api.importExportList.loadQueueLength,
        {
          params
        }
      ).pipe(
        map(data => {
          return {
            data
          };
        })
      )
    ), 'apiLoadImportExportLength');
  }

  public apiLoadImportExportErrorReport(noteId) {
    const headers = new Headers();
    return this.http.get(
      this.configService.config.api.importExportList.downloadErrorReport(noteId), {
        headers,
        responseType: 'blob'
      }
    );
  }

  public apiDownloadImportExportNote(noteId: number) {
    const headers = new Headers();
    return this.http.get(
      this.configService.config.api.importExportList.downloadExportResult(noteId), {
        headers
      }
    );
  }

  public apiDirectDownload(link: string, filename: string): Observable<{ blob: Blob, fileName: string }> {
    return this.http.get(link, {
      responseType: 'blob',
    }).pipe(
      map((blob: Blob) => ({ blob, fileName: filename }))
    );
  }
  public apiGetPreviewOnItemId(itemId: number, params: { [key: string]: string }): Observable<any> {
    const httpParams = new HttpParams({ fromObject: params });

    return this.http.get(
      this.configService.config.api.importExportList.queueItemPreview(itemId),
      {
        params: httpParams
      }
    );
  }
}
