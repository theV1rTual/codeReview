import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs-compat';
import { Observable } from 'rxjs-compat/Observable';
import { StreamWsDto } from '@app/interfaces/websocket.dto';
import { StreamProgressEnum } from '@app/enums/stream-progress';
import { Store } from '@ngrx/store';
import { IAppState } from '@app/store/state/app.states';
import { ClosePanel } from '@app/store/actions/panel.actions';

export interface TaskStream {
    taskNumber: string;
    calls: Call[];
}

export interface Call {
    from: string;
    to: string;
    streams: Pick<StreamWsDto, 'id' | 'urls'>[];
}

@Injectable({
    providedIn: 'root'
})
export class StreamService {
    constructor(private store: Store<IAppState>
    ) {}
    private data: BehaviorSubject<TaskStream[]> = new BehaviorSubject<TaskStream[]>([]);
    private _streamsStorage: Map<string, StreamWsDto> = new Map<string, StreamWsDto>();

    handleStream(stream: StreamWsDto): void {
        switch (stream.progress) {
            case StreamProgressEnum.initiated:
                this.putStream(stream);
                break;
            case StreamProgressEnum.terminated:
                this.removeStream(stream);
                setTimeout(() => {
                    this.store.dispatch(
                        new ClosePanel({
                            isVisible: false,
                            active: false
                        })
                    );
                }, 7000);
                break;
            default:
                return;
        }
    }

    private setStreams(): void {
        const data: TaskStream[] = [];
        const streamsArray = Array.from(this._streamsStorage.values());
        const uniqueTaskNumbers = new Set(streamsArray.map(value => value.task_number));
        uniqueTaskNumbers.forEach(taskNumber => {
            data.push({
                taskNumber,
                calls: this.getCalls(streamsArray.filter(value => value.task_number === taskNumber))
            });
        });
        this.data.next(data);
    }

    getCalls(streams: StreamWsDto[]): Call[] {
        const uniqueStreamsByCall: Call[] = [];
        for (const stream of streams) {
            if (uniqueStreamsByCall.findIndex(value => value.from === stream.from && value.to === stream.to) === -1) {
                uniqueStreamsByCall.push({
                    from: stream.from,
                    to: stream.to,
                    streams: streams.filter(value => value.from === stream.from && value.to === stream.to)
                        .map(value => ({
                            urls: value.urls,
                            id: value.id
                        }))
                });
            }
        }
        return uniqueStreamsByCall;
    }

    get streams(): Observable<TaskStream[]> {
        return this.data.asObservable();
    }

    private putStream(stream: StreamWsDto): void {
        this._streamsStorage.set(stream.id, stream);
        this.setStreams();
    }

    private removeStream(stream: StreamWsDto): void {
        this._streamsStorage.delete(stream.id);
        this.setStreams();
    }
}
