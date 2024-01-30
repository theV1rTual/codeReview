import {TranslateService} from '@ngx-translate/core';
import {Injectable} from '@angular/core';
import {Effect, ofType, Actions} from '@ngrx/effects';
import {switchMap, catchError, mergeMap} from 'rxjs/operators';
import {CloseModal} from '../actions/modal.actions';
import {
    EAccountsActions,
    SetAccount,
    SetAccountSuccess,
    DeleteAccounts,
    DeleteAccountsSuccess,
    SearchAccounts,
    SearchAccountsSuccess,
    GetRolesSuccess,
    EditAccount,
    EditAccountSuccess,
    GetAccountsPaginationSuccess,
    GetAccountsView,
    GetAccountsViewSuccess,
    GetAccountByIdSuccess,
    ErrorHandling,
    SaveParamsSuccess, GetFoldersForAccount, GetFoldersForAccountSuccess
} from '../actions/accounts.actions';
import {AccountsService} from 'src/app/shared/services/accounts.service';
import {EventService} from 'src/app/shared/services/event.service';
import {Account} from '../../shared/models/accounts.model';

@Injectable()
export class AccountsEffects {
    constructor(
        private actions$: Actions,
        private accountsService: AccountsService,
        private eventService: EventService,
        private translate: TranslateService
    ) {
    }

    @Effect()
    addAccount$ = this.actions$.pipe(
        ofType(EAccountsActions.SetAccount),
        switchMap((action: SetAccount) => {
            return this.accountsService.setAccount(action.payload, action.logging).pipe(
                mergeMap((accounts: Account) => {
                    this.eventService.notificationSuccess.emit(this.translate.instant('ERROR.SUCCESSFUL_REQUEST'));
                    return [
                        new SetAccountSuccess(accounts),
                        new CloseModal({
                            modal: false
                        })
                    ];
                }),
                catchError(() => {
                    return [new ErrorHandling(null)];
                })
            );
        })
    );

    @Effect()
    editAccount$ = this.actions$.pipe(
        ofType(EAccountsActions.EditAccount),
        switchMap((action: EditAccount) => {
            return this.accountsService.editAccount(action.payload, action.logging).pipe(
                mergeMap((accounts: Account) => {
                    this.eventService.notificationSuccess.emit(this.translate.instant('ERROR.SUCCESSFUL_REQUEST'));
                    return [
                        new EditAccountSuccess(accounts),
                        new CloseModal({
                            modal: false
                        })
                    ];
                }),
                catchError(() => {
                    return [new ErrorHandling(null)];
                })
            );
        })
    );

    @Effect()
    DeleteAccounts$ = this.actions$.pipe(
        ofType(EAccountsActions.DeleteAccounts),
        switchMap((action: DeleteAccounts) => {
            return this.accountsService.deleteAccounts(action.payload, action.logging).pipe(
                mergeMap(() => {
                    this.eventService.notificationSuccess.emit(this.translate.instant('ERROR.SUCCESSFUL_REQUEST'));
                    return [
                        new DeleteAccountsSuccess(action.payload),
                        new CloseModal({
                            modal: false
                        })
                    ];
                }),
                catchError(() => {
                    return [new ErrorHandling(null)];
                })
            );
        })
    );

    @Effect()
    searchAccounts$ = this.actions$.pipe(
        ofType(EAccountsActions.SearchAccounts),
        switchMap((action: SearchAccounts) => {
            return this.accountsService.getAccountsSearch(action.payload).pipe(
                mergeMap((content) => {
                    return [
                        new SearchAccountsSuccess(content)
                    ];
                }),
                catchError(() => {
                    return [new SearchAccountsSuccess([])];
                })
            );
        })
    );

    @Effect()
    getRoles$ = this.actions$.pipe(
        ofType(EAccountsActions.GetRoles),
        switchMap(() =>
            this.accountsService.getRoles().pipe(
                mergeMap((content) => {
                    const user = JSON.parse(localStorage.getItem('user'));
                    const currentRole = user ? user.role : '';
                    content = currentRole === 'OPERATOR_ADMIN' ? content.OPERATOR_ADMIN : content.ROLES;
                    return [new GetRolesSuccess(content)];
                }),
                catchError(() => {
                    return [];
                })
            )
        )
    );

    @Effect()
    getAccountsByParams$ = this.actions$.pipe(
        ofType(EAccountsActions.GetAccountsView),
        switchMap((action: GetAccountsView) =>
            this.accountsService.getAccountsList({...action.pagination, ...action.payload, ...action.requestParams}).pipe(
                mergeMap((content) => {
                    return [
                        new GetAccountsViewSuccess(content.results, action.payload),
                        new GetAccountsPaginationSuccess({
                            count: content.count,
                            next: content.next,
                            previous: content.previous,
                            paginationParams: action.pagination
                        }),
                        new SaveParamsSuccess(action.payload),
                        new CloseModal({
                            modal: false
                        })
                    ];
                }),
                catchError(() => {
                    return [
                        new GetAccountsViewSuccess([], null),
                        new GetAccountsPaginationSuccess({paginationParams: action.pagination}),
                        new SaveParamsSuccess(action.payload),
                        new CloseModal({
                            modal: false
                        })
                    ];
                })
            )
        )
    );

    @Effect()
    getAccountById = this.actions$.pipe(
        ofType(EAccountsActions.GetAccountById),
        switchMap((action: GetAccountByIdSuccess) =>
            this.accountsService.getAccountById(action.payload).pipe(
                mergeMap((content) => {
                    return [
                        new GetAccountByIdSuccess(content),
                    ];
                }),
                catchError(() => {
                    return [
                        new GetAccountByIdSuccess(null)
                    ];
                })
            )
        )
    );

    @Effect()
    getFoldersForAccount = this.actions$.pipe(
        ofType(EAccountsActions.GetFoldersForAccount),
        switchMap((action: GetFoldersForAccount) =>
            this.accountsService.getFoldersForAccount(action.account).pipe(
                mergeMap((content) => {
                    return [
                        new GetFoldersForAccountSuccess(action.account, content)
                    ];
                }),
                catchError(() => {
                    return [
                        new GetFoldersForAccountSuccess(null)
                    ];
                })
            )
        )
    );
}
