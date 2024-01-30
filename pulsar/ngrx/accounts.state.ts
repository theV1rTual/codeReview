import {Pagination, SearchAccountsWithParams} from '../../shared/models/searchModels';
import {Account} from '../../shared/models/accounts.model';

export interface IAccountsState {
    accounts: Account[];
    searchedAccounts: Account[];
    roles: [];
    pagination: Pagination;
    accountsParams: SearchAccountsWithParams;
    selectedAccount: Account;
    loading: boolean;
}

export const initialAccountsState: IAccountsState = {
    accounts: [],
    searchedAccounts: [],
    roles: [],
    pagination: {
        paginationParams: {offset: 0, limit: 50}
    },
    accountsParams: {},
    selectedAccount: null,
    loading: false
};
