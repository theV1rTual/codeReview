import { IAccountsState, initialAccountsState } from '../state/accounts.state';
import { AccountsActions, EAccountsActions } from '../actions/accounts.actions';

export function accountsReducers(state = initialAccountsState, action: AccountsActions): IAccountsState {
    switch (action.type) {
        case EAccountsActions.SetAccount:
        case EAccountsActions.EditAccount:
        case EAccountsActions.DeleteAccounts:
        case EAccountsActions.GetAccountsView: {
            return {
                ...state,
                loading: true
            };
        }

        case EAccountsActions.SetAccountSuccess: {
            return {
                ...state,
                loading: false,
                accounts: [action.payload, ...state.accounts]
            };
        }

        case EAccountsActions.EditAccountSuccess: {
            const idx = state.accounts.findIndex((c) => c.id === action.payload.id);
            state.accounts[idx] = action.payload;
            return {
                ...state,
                loading: false,
                accounts: [...state.accounts]
            };
        }

        case EAccountsActions.DeleteAccountsSuccess: {
            return {
                ...state,
                loading: false,
                accounts: [...state.accounts.filter((r) => !action.payload.includes(r.id))]
            };
        }

        case EAccountsActions.SearchAccountsSuccess: {
            return {
                ...state,
                searchedAccounts: action.payload
            };
        }

        case EAccountsActions.GetRolesSuccess: {
            return {
                ...state,
                roles: action.payload
            };
        }


        case EAccountsActions.GetAccountsViewSuccess: {
            return {
                ...state,
                loading: false,
                accounts: action.params && action.params.supervisor_journal
                    ? rebaseUsersArray(action.payload) : action.payload
            };
        }

        case EAccountsActions.GetAccountsPaginationSuccess: {
            return {
                ...state,
                pagination: action.payload
            };
        }

        case EAccountsActions.SaveParamsSuccess: {
            return {
                ...state,
                accountsParams: action.payload
            };
        }

        case EAccountsActions.GetAccountByIdSuccess: {
            return {
                ...state,
                selectedAccount: action.payload
            };
        }

        case EAccountsActions.GetFoldersForAccountSuccess: {
            const index = state.accounts.indexOf(action.account);
            if (index > -1) {
                state.accounts[index].folder = action.folders;
            }
            return {
                ...state
            };
        }

        case EAccountsActions.SelectOne: {
            return {
                ...state,
                accounts: state.accounts.map(value =>
                    value.id === action.id
                        ? {...value, isChecked: !action.value}
                        : value
                )
            };
        }

        case EAccountsActions.SelectAll: {
            return {
                ...state,
                accounts: state.accounts.map(value => ({
                    ...value,
                    isChecked: !action.value
                }))
            };
        }

        case EAccountsActions.ErrorHandling: {
            return {
                ...state,
                loading: false
            };
        }

        default:
            return state;
    }
}

function rebaseUsersArray(payload) {
    return payload.map(el => {
        el = {...el, ...el.user};
        return el;
    });
}
