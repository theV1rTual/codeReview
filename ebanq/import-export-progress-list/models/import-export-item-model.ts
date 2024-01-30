import { mergeSnackKeysProperties } from '@helpers/stringHelpers';

export class ImportExportItemModel {

  public id: number;
  public userId: string;
  public token: string;
  public message: string;
  public createdAt: string;
  public finishedAt: string;
  public action: string;
  public actionTitle: string;
  public status: string;
  public progress: string;
  public type: string;

  public constructor(params: object) {
    mergeSnackKeysProperties(this, params);
  }
}
