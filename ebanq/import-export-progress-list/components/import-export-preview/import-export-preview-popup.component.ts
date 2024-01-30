import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { ImportExportScrollEndService } from '@lib/modules/import-export-progress-list/components/import-export-preview/services/import-export-scroll-end.service';

@Component({
  selector: 'app-import-export-preview-popup',
  templateUrl: './import-export-preview-popup.component.html',
  styleUrls: ['./import-export-preview-popup.component.scss']
})
export class ImportExportPreviewPopupComponent implements OnInit {

  @Input() headingMessage = '';
  @Input() settingsTitle = '';
  @Input() previewItemId: number = null;
  @Input() errorMessage: {} = {};
  @Output() previewSubmit: EventEmitter<void> = new EventEmitter<void>();
  messsageArray = [];

  constructor(
    private importExportScrollEndService: ImportExportScrollEndService
  ) {
  }

  ngOnInit() {
    const lines = this.errorMessage['message'].split('\n');
    this.messsageArray = [];

    lines.forEach(line => {
      this.messsageArray.push(line);
    });
  }

  public onClose(): void {
    this.previewSubmit.emit();
  }

  public onScroll(eventData): void {
    const scrollPosition = eventData.srcElement.scrollTop + eventData.srcElement.offsetHeight;
    const scrollMax = eventData.srcElement.scrollHeight;
    if (scrollPosition > scrollMax) {
      this.importExportScrollEndService.triggerScrollEndEvent();
    }
  }
}
