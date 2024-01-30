import { Component, Input, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { UnsubscribeDestroyHelper } from '@helpers/unsubscribe-destroy.helper';
import { filter, takeUntil } from 'rxjs/operators';
import { ImportExportBadgeService } from '../import-export-redirect-badge/services/import-export-badge.service';
import {ImportExportItemModel} from "../../models/import-export-item-model";

@Component({
  selector: 'app-import-export-header',
  templateUrl: './import-export-header.component.html',
  styleUrls: ['./import-export-header.component.scss']
})
export class ImportExportHeaderComponent extends UnsubscribeDestroyHelper implements OnInit {

  private backDeepAmount = -1;
  @Input() public importExportList: ImportExportItemModel[] = [];

  constructor(
    private router: Router,
    private importExportBadgeService: ImportExportBadgeService,
  ) {
    super();

    this.trackUrlChange();
  }

  ngOnInit() {
  }

  public onBack(): void {
    const savedQueryParams = this.importExportBadgeService.getQueryParams();
    if (Object.values(savedQueryParams).length) {
      const savedUrl = savedQueryParams[1];
      this.router.navigateByUrl(savedUrl)
      this.importExportBadgeService.queryValidator(true);
    } else {
      window.history.go(this.backDeepAmount);
    }
  }

  private trackUrlChange(): void {
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntil(this.unsubscribeSubject)
      ).subscribe(() => {
          
      this.backDeepAmount = this.backDeepAmount - 1;
    });
  }
}
