import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { WebsocketDto } from '@app/interfaces/websocket.dto';
import { Observable, Subject } from 'rxjs-compat';
import { Nullable } from '@app/types/nullable.type';

@Injectable({providedIn: 'root'})
export class WebsocketService {
    private ws: WebSocket;
    private url = environment.webSocketUrl;
    private wsUpdates: Subject<WebsocketDto> = new Subject<WebsocketDto>();

    public connect(): void {
        if (this.ws) {
            console.warn('Websocket already connected');
        }
        if (!this.token) {
            console.error('Websocket connection: Token not found');
        }
        this.ws = new WebSocket(`${ this.url }notifications/?token=${ this.token }`);
        this.ws.onmessage = (event) => {
            const dto = JSON.parse(event.data) as WebsocketDto;
            this.wsUpdates.next(dto);
        };

        this.ws.onerror = (): void => {
            this.connect();
        };
    }

    public destroy(): void {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    public get wsUpdatesStream(): Observable<WebsocketDto> {
        return this.wsUpdates.asObservable();
    }

    public sendMessage(event: string, data: { [key: string]: any }): void {
        if (!this.ws) {
            return;
        }
        this.ws.send(JSON.stringify({event, data}));
    }

    private get token(): Nullable<string> {
        return localStorage.getItem('token');
    }
}
