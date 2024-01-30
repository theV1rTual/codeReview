import { PaginationParams, RequestParams, SearchAccountsWithParams } from '@app/shared/models/searchModels';
import { Action } from '@ngrx/store';
import { Account, Folder } from '@app/shared/models/accounts.model';

export enum EAccountsActions {
    SetAccount = 'Set Account',
    SetAccountSuccess = 'Set Account Success',

    EditAccount = 'Edit Account',
    EditAccountSuccess = 'Edit Account Success',

    DeleteAccounts = 'Delete Accounts',
    DeleteAccountsSuccess = 'Delete Accounts Success',

    SearchAccounts = '[SearchAccounts] SearchAccounts',
    SearchAccountsSuccess = '[SearchAccountsSuccess] SearchAccountsSuccess',

    GetAccountsView = '[GetAccountsView] GetAccountsView',
    GetAccountsViewSuccess = '[GetAccountsViewSuccess] GetAccountsViewSuccess',

    GetRoles = '[Roles] Get Roles',
    GetRolesSuccess = '[Roles] Get Roles Success',

    GetAccountsPaginationSuccess = '[GetAccountsPaginationSuccess] GetAccountsPaginationSuccess',
    SaveParamsSuccess = '[Accounts] Save Params Success',

    GetAccountById = '[Accounts] Get AccountById',
    GetAccountByIdSuccess = '[Accounts] Get AccountById Success',

    GetFoldersForAccount = '[Accounts] Get folder for account',
    GetFoldersForAccountSuccess = '[Accounts] Get folder for account success',

    ErrorHandling = '[Accounts] Handle Error',
    SelectOne = '[Accounts] SelectOne',
    SelectAll = '[Accounts] SelectAll',
}

export class SetAccount implements Action {
    public readonly type = EAccountsActions.SetAccount;

    constructor(public payload: Account, public logging?: any) {
    }
}

export class SetAccountSuccess implements Action {
    public readonly type = EAccountsActions.SetAccountSuccess;

    constructor(public payload: Account) {
    }
}

export class EditAccount implements Action {
    public readonly type = EAccountsActions.EditAccount;

    constructor(public payload: Account, public logging?: any) {
    }
}

export class EditAccountSuccess implements Action {
    public readonly type = EAccountsActions.EditAccountSuccess;

    constructor(public payload: Account) {
    }
}

export class DeleteAccounts implements Action {
    readonly type = EAccountsActions.DeleteAccounts;

    constructor(public payload: any[], public logging?: any) {
    }
}

export class DeleteAccountsSuccess implements Action {
    readonly type = EAccountsActions.DeleteAccountsSuccess;

    constructor(public payload: any[]) {
    }
}

export class SearchAccounts implements Action {
    readonly type = EAccountsActions.SearchAccounts;

    constructor(public payload: any) {
    }
}

export class SearchAccountsSuccess implements Action {
    readonly type = EAccountsActions.SearchAccountsSuccess;

    constructor(public payload: Account[]) {
    }
}

export class GetRoles implements Action {
    public readonly type = EAccountsActions.GetRoles;
}

export class GetRolesSuccess implements Action {
    public readonly type = EAccountsActions.GetRolesSuccess;

    constructor(public payload: []) {
    }
}

export class GetAccountsView implements Action {
    public readonly type = EAccountsActions.GetAccountsView;

    constructor(
        public pagination: PaginationParams,
        public payload: SearchAccountsWithParams,
        public requestParams: RequestParams) {
    }
}

export class GetAccountsViewSuccess implements Action {
    public readonly type = EAccountsActions.GetAccountsViewSuccess;

    constructor(public payload: Account[], public params: any) {
    }
}

export class GetAccountsPaginationSuccess implements Action {
    readonly type = EAccountsActions.GetAccountsPaginationSuccess;

    constructor(public payload: any) {
    }
}

export class SaveParamsSuccess implements Action {
    readonly type = EAccountsActions.SaveParamsSuccess;

    constructor(public payload: SearchAccountsWithParams) {
    }
}

export class GetAccountById implements Action {
    public readonly type = EAccountsActions.GetAccountById;

    constructor(public payload: any) {
    }
}

export class GetAccountByIdSuccess implements Action {
    public readonly type = EAccountsActions.GetAccountByIdSuccess;

    constructor(public payload: Account) {
    }
}

export class GetFoldersForAccount implements Action {
    public readonly type = EAccountsActions.GetFoldersForAccount;

    constructor(public account: Account) {
    }
}

export class GetFoldersForAccountSuccess implements Action {
    public readonly type = EAccountsActions.GetFoldersForAccountSuccess;

    constructor(public account?: Account, public folders?: Folder[]) {
    }
}

export class ErrorHandling implements Action {
    readonly type = EAccountsActions.ErrorHandling;

    constructor(public payload: any) {
    }
}

export class SelectOneAccount implements Action {
    readonly type = EAccountsActions.SelectOne;

    constructor(public id: string, public value: boolean) {}
}

export class SelectAllAccounts implements Action {
    readonly type = EAccountsActions.SelectAll;

    constructor(public value: boolean) {}
}

export type AccountsActions =
    | SetAccount
    | SetAccountSuccess
    | EditAccount
    | EditAccountSuccess
    | DeleteAccounts
    | DeleteAccountsSuccess
    | SearchAccounts
    | SearchAccountsSuccess
    | GetRoles
    | GetRolesSuccess
    | GetAccountsView
    | GetAccountsViewSuccess
    | GetAccountsPaginationSuccess
    | SaveParamsSuccess
    | GetAccountById
    | GetAccountByIdSuccess
    | GetFoldersForAccount
    | GetFoldersForAccountSuccess
    | SelectOneAccount
    | SelectAllAccounts
    | ErrorHandling;
