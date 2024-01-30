import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ImportExportTableComponent } from './components/import-export-table/import-export-table.component';
import { ImportExportPreviewPopupComponent } from './components/import-export-preview/import-export-preview-popup.component';
import { ImportExportPreviewTableComponent } from './components/import-export-preview/components/import-export-preview-table/import-export-preview-table.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { RouterModule } from '@angular/router';
import { ApplicationPipesModule } from '@lib/modules/application-pipes/application-pipes.module';
import { SharedComponentsModule } from '@lib/modules/shared-components/shared-components.module';
import { ImportExportListApiService } from '@lib/modules/import-export-progress-list/services/import-export-list-api.service';
import { ImportExportListService } from '@lib/modules/import-export-progress-list/services/import-export-list.service';
import { ImportExportHeaderComponent } from './components/import-export-back/import-export-header.component';
import { ImportExportScrollEndService } from '@lib/modules/import-export-progress-list/components/import-export-preview/services/import-export-scroll-end.service';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NgSelectModule,
    RouterModule,
    ApplicationPipesModule,
    SharedComponentsModule,
],
  declarations: [
    ImportExportTableComponent,
    ImportExportPreviewPopupComponent,
    ImportExportPreviewTableComponent,
    ImportExportHeaderComponent
  ],
  exports: [
  ],
  providers: [
    ImportExportListService,
    ImportExportListApiService,
    ImportExportScrollEndService
  ]
})
export class ImportExportProgressListModule { }
