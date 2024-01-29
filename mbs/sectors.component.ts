import {
    AfterViewInit,
    Component,
    EventEmitter,
    Input,
    OnChanges,
    OnDestroy,
    OnInit,
    Output,
    SimpleChanges,
} from '@angular/core';
import * as L from 'leaflet';
import {
    LatLng,
    LatLngBounds,
    LatLngBoundsExpression,
    LatLngExpression,
    LatLngTuple,
    LeafletMouseEvent,
    Map,
} from 'leaflet';
import * as PIXI from 'pixi.js';
import { LoaderResource } from 'pixi.js';
import 'leaflet-pixi-overlay';
import '../../helpers/leaflet-draw';
import 'leaflet-fullscreen';
import { combineLatest, debounceTime, filter, fromEvent, Observable, Subject, takeUntil, tap } from 'rxjs';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Select } from '@ngxs/store';
import {
    AddMapCircleLayer,
    AddMapPolygonLayer,
    AddRectangleLayer,
    GetSectorsByBounds,
    GetSectorsByPoint,
    RemoveAllSelected,
    RemoveLayers,
} from '@app/store/actions/map.actions';
import { CurrentSectorInterface, MapState } from '@app/store/state/map.state';
import { SectorInterface } from '@app/interfaces/sector.interface';
import { TechnologyType } from '@app/types/technology.type';
import { TechnologyEnum } from '@app/enums/technology.enum';
import { MapDrawService } from '@app/services/map-draw.service';
import { GeometryEnum } from '@app/enums/geometry.enum';
import { Dispatch } from '@ngxs-labs/dispatch-decorator';
import { SelectSnapshot } from '@ngxs-labs/select-snapshot';
import { SectorColorEnum } from '@app/enums/sector-color.enum';
import { SectorRadiusEnum } from '@app/enums/sector-radius.enum';
import { MapAreaInterface } from '@app/interfaces/map-area.interface';
import 'leaflet-control-geocoder';
import { environment } from '@environment/environment';
import { BlockModeEnum } from '@app/enums/block-mode.enum';
import { SectorOutlineColorEnum } from '@app/enums/sector-outline-color.enum';
import { Nullable } from '@app/types/nullable.type';

@Component({
    standalone: true,
    selector: 'app-sectors',
    templateUrl: './sectors.component.html',
    imports: [MatProgressBarModule],
})
export class SectorsComponent implements AfterViewInit, OnInit, OnDestroy, OnChanges {
    @Input()
    sectorInfo: Nullable<CurrentSectorInterface>;

    @Output()
    getSectorInfo: EventEmitter<LatLng> = new EventEmitter<LatLng>();

    @Select(MapState.sectors)
    sectors$!: Observable<SectorInterface[]>;

    @Select(MapState.searchedSectors)
    searchedSectors$: Observable<SectorInterface[]>;

    @Select(MapState.selectedSectors)
    selectedSectors$: Observable<SectorInterface[]>;

    @Select(MapState.technologiesToView)
    technologiesToView$: Observable<TechnologyType[]>;

    @Select(MapState.offlineMode)
    offlineMode: Observable<boolean>;

    @SelectSnapshot(MapState.technologiesToView)
    technologiesToView: TechnologyType[];

    private map!: L.Map;
    private pixiContainer!: PIXI.Container;
    private project: Map['latLngToLayerPoint'];
    private pixiResources: Partial<Record<string, LoaderResource>>;
    private currentScale: number;
    private renderer: unknown;
    private firstDraw = true;
    private sectors: SectorInterface[] = [];
    private selectedSectors: SectorInterface[] = [];
    private searchedSectors: SectorInterface[] = [];
    private drawnItems: L.FeatureGroup;
    private unSubscriber$: Subject<boolean> = new Subject<boolean>();
    private baseStationTexture: PIXI.Texture;
    private gsmTexture: PIXI.Texture;
    private umtsTexture: PIXI.Texture;
    private lteTexture: PIXI.Texture;
    // conditionally blocked textures
    private cnBlockedGsmTexture: PIXI.Texture;
    private cnBlockedUmtsTexture: PIXI.Texture;
    private cnBlockedLteTexture: PIXI.Texture;
    // unconditionally blocked textures
    private unBlockedGsmTexture: PIXI.Texture;
    private unBlockedUmtsTexture: PIXI.Texture;
    private unBlockedLteTexture: PIXI.Texture;
    private selectedGsmTexture: PIXI.Texture;
    private selectedUmtsTexture: PIXI.Texture;
    private selectedLteTexture: PIXI.Texture;
    private sectorInfoPopup: L.Popup | null = null;
    private drawMode = false;

    constructor(private mapDrawService: MapDrawService) {}

    private initMap(): void {
        const savedZoom = JSON.parse(sessionStorage.getItem('mapZoom'));
        const savedCenter = JSON.parse(sessionStorage.getItem('mapCenter'));

        this.map = L.map('map', {
            preferCanvas: true,
            zoomControl: false,
            attributionControl: false,
        });

        if (savedZoom && savedCenter) {
            this.map.setView(savedCenter, savedZoom);
        } else {
            this.map.setView([48, 68], 5);
        }

        if (this.technologiesToView.length && this.map.getZoom() > 11) {
            const latlngs = this.calculateLatLngExpression();
            this.getSectors(this.technologiesToView, latlngs);
        }

        const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 18,
            className: 'map-tiles',
        });

        this.map.addLayer(tileLayer);

        this.offlineMode
            .pipe(takeUntil(this.unSubscriber$))
            .subscribe((value) => tileLayer.setUrl(value ? environment.offlineMapUrl : environment.mapUrl));

        this.drawnItems = new L.FeatureGroup();
        this.map.addLayer(this.drawnItems);
        this.map.addControl(
            new L.Control['Fullscreen']({
                title: {
                    false: 'Полноэкранный режим',
                    true: 'Выйти из полноэкранного режима',
                } as unknown as string,
                position: 'topright',
            }),
        );
        this.map.addControl(L.control.zoom({ position: 'topright' }));
        const drawControl = new L.Control['Draw']({
            draw: {
                polyline: false,
                marker: false,
                circlemarker: false,
            },
            edit: {
                featureGroup: this.drawnItems,
            },
            position: 'topright',
        });
        this.map.addControl(drawControl);

        const options = {
            position: 'topleft',
            defaultMarkGeocode: false,
            geocoder: L.Control['Geocoder'].nominatim({
                geocodingQueryParams: {
                    countrycodes: 'kz',
                },
            }),
        };

        L.Control['geocoder'](options)
            .on('markgeocode', (e) => {
                const bbox = e.geocode.bbox;
                const center = e.geocode.center;
                const marker = L.marker(center);
                const polygon = L.polygon([bbox.getSouthEast(), bbox.getNorthEast(), bbox.getNorthWest(), bbox.getSouthWest()]);
                marker.addTo(this.map);
                this.map.fitBounds(polygon.getBounds());
            })
            .addTo(this.map);

        fromEvent(this.map, 'draw:drawstart').subscribe(() => {
            this.drawMode = true;
        });

        fromEvent(this.map, 'draw:editstart').subscribe(() => {
            this.drawMode = true;
        });

        fromEvent(this.map, 'draw:deletestart').subscribe(() => {
            this.drawMode = true;
        });

        fromEvent(this.map, 'draw:drawstop')
            .pipe(debounceTime(10))
            .subscribe(() => {
                this.drawMode = false;
            });

        fromEvent(this.map, 'draw:editstop')
            .pipe(debounceTime(10))
            .subscribe(() => {
                this.drawMode = false;
            });

        fromEvent(this.map, 'draw:deletestop')
            .pipe(debounceTime(10))
            .subscribe(() => {
                this.drawMode = false;
            });

        fromEvent(this.map, 'draw:created').subscribe((event) => {
            const layer = event['layer'];
            this.drawnItems.addLayer(layer);
            if (event['layerType'] === 'circle') {
                const _mRadius = layer['_mRadius'];
                const _latlng = layer['_latlng'];
                const _leaflet_id = layer['_leaflet_id'];
                this.addMapCircleLayer(_leaflet_id, _mRadius, [_latlng.lat, _latlng.lng], this.technologiesToView);
                return;
            }
            if (event['layerType'] === 'polygon') {
                const _latlngs = event['layer']['_latlngs'];
                const _leaflet_id = event['layer']['_leaflet_id'];
                const latlngs = _latlngs[0].map((value) => [value.lat, value.lng]) as LatLngExpression[];
                latlngs.push(latlngs[0]);
                this.addMapPolygonLayer(_leaflet_id, latlngs, this.technologiesToView);
            }
            if (event['layerType'] === 'rectangle') {
                const _latlngs = event['layer']['_latlngs'];
                const _leaflet_id = event['layer']['_leaflet_id'];
                const latlngs = _latlngs[0].map((value) => [value.lat, value.lng]) as LatLngExpression[];
                latlngs.push(latlngs[0]);
                this.addRectangleLayer(_leaflet_id, latlngs, this.technologiesToView);
            }
        });

        fromEvent(this.map, 'draw:edited').subscribe((event) => {
            const _layers = event['layers']['_layers'];
            const layersArray = Object.keys(_layers).map((key) => [Number(key), _layers[key]]);
            this.removeLayers(layersArray.map((value) => value[0]));
            for (const layer of layersArray) {
                const id = layer[0];
                const area = layer[1];
                if (area instanceof L.Circle) {
                    const _mRadius = area['_mRadius'];
                    const _latlng = area['_latlng'];
                    this.addMapCircleLayer(id, _mRadius, [_latlng.lat, _latlng.lng], this.technologiesToView);
                }
                if (area instanceof L.Polygon) {
                    const _latlngs = area['_latlngs'];
                    const latlngs = _latlngs[0].map((value) => [value.lat, value.lng]) as LatLngExpression[];
                    latlngs.push(latlngs[0]);
                    this.addMapPolygonLayer(id, latlngs, this.technologiesToView);
                }
                if (area instanceof L.Rectangle) {
                    const _latlngs = area['_latlngs'];
                    const latlngs = _latlngs[0].map((value) => [value.lat, value.lng]) as LatLngExpression[];
                    latlngs.push(latlngs[0]);
                    this.addRectangleLayer(id, latlngs, this.technologiesToView);
                }
            }
        });

        fromEvent(this.map, 'draw:deleted').subscribe((event) => {
            const leafletIds = Object.keys(event['layers']['_layers']).map((key) => Number(key));
            this.removeLayers(leafletIds);
        });

        fromEvent(this.map, 'click')
            .pipe(filter(() => !this.drawMode && Boolean(this.technologiesToView.length)))
            .subscribe((event: LeafletMouseEvent) => {
                if (this.technologiesToView.length) {
                    const { lat, lng } = event.latlng;
                    this.getSectorsByPoint([lat, lng]);
                }
            });

        fromEvent(this.map, 'zoomend').subscribe(() => {
            if (this.map.getZoom() < 12 || !this.technologiesToView.length) {
                return;
            }

            const latlngs = this.calculateLatLngExpression();
            this.getSectors(this.technologiesToView, latlngs);
        });

        fromEvent(this.map, 'moveend').subscribe(() => {
            sessionStorage.setItem('mapZoom', JSON.stringify(this.map.getZoom()));
            sessionStorage.setItem('mapCenter', JSON.stringify(this.map.getCenter()));

            if (this.map.getZoom() < 12 || !this.technologiesToView.length) {
                return;
            }

            const latlngs = this.calculateLatLngExpression();
            this.getSectors(this.technologiesToView, latlngs);
        });

        fromEvent(this.map, 'mousemove')
            .pipe(
                debounceTime(500),
                tap(() => {
                    this.removeSectorInfoPopup();
                }),
                takeUntil(this.unSubscriber$),
                filter(() => Boolean(this.technologiesToView.length)),
            )
            .subscribe((value: LeafletMouseEvent) => {
                this.getSectorInfo.emit(value.latlng);
            });

        let frame = null;
        const loader = new PIXI.Loader();
        loader.add('marker', 'assets/leaflet/images/marker-icon.png');
        this.pixiContainer = new PIXI.Container();
        this.pixiContainer.sortableChildren = true;
        loader.load((pixiLoader, resources) => {
            L['pixiOverlay']((utils) => {
                if (frame) {
                    cancelAnimationFrame(frame);
                    frame = null;
                }
                this.renderer = utils.getRenderer();
                this.initTextures();
                this.project = utils.latLngToLayerPoint;
                this.pixiResources = resources;
                this.currentScale = Math.min(1 / utils.getScale(), 0.03125);
                if (this.firstDraw) {
                    combineLatest([this.sectors$, this.selectedSectors$, this.searchedSectors$])
                        .pipe(takeUntil(this.unSubscriber$))
                        .subscribe((value) => {
                            this.sectors = [...value[0], ...value[2]];
                            this.searchedSectors = value[2];
                            this.selectedSectors = value[1];
                            this.pixiContainer.removeChildren();
                            this.drawMarkers();
                            this.renderer['render'](this.pixiContainer);
                        });
                }
                this.firstDraw = false;
                this.renderer['render'](this.pixiContainer);

                const animate = (): void => {
                    this.pixiContainer.children
                        .filter((value) => value.name === 'marker')
                        .forEach((value) => value.scale.set(this.currentScale));
                };

                frame = requestAnimationFrame(animate);
            }, this.pixiContainer).addTo(this.map);
        });
    }

    private initTextures(): void {
        this.baseStationTexture = this.renderer['generateTexture'](this.createBaseStationCircle());

        this.gsmTexture = this.renderer['generateTexture'](
            this.createSectorCircle(TechnologyEnum.GSM, false, BlockModeEnum.NO_BLOCK),
        );

        this.umtsTexture = this.renderer['generateTexture'](
            this.createSectorCircle(TechnologyEnum.UMTS, false, BlockModeEnum.NO_BLOCK),
        );

        this.lteTexture = this.renderer['generateTexture'](
            this.createSectorCircle(TechnologyEnum.LTE, false, BlockModeEnum.NO_BLOCK),
        );

        this.cnBlockedGsmTexture = this.renderer['generateTexture'](
            this.createSectorCircle(TechnologyEnum.GSM, false, BlockModeEnum.CN),
        );

        this.cnBlockedUmtsTexture = this.renderer['generateTexture'](
            this.createSectorCircle(TechnologyEnum.UMTS, false, BlockModeEnum.CN),
        );

        this.cnBlockedLteTexture = this.renderer['generateTexture'](
            this.createSectorCircle(TechnologyEnum.LTE, false, BlockModeEnum.CN),
        );

        this.unBlockedGsmTexture = this.renderer['generateTexture'](
            this.createSectorCircle(TechnologyEnum.GSM, false, BlockModeEnum.UC),
        );

        this.unBlockedUmtsTexture = this.renderer['generateTexture'](
            this.createSectorCircle(TechnologyEnum.UMTS, false, BlockModeEnum.UC),
        );

        this.unBlockedLteTexture = this.renderer['generateTexture'](
            this.createSectorCircle(TechnologyEnum.LTE, false, BlockModeEnum.UC),
        );

        this.selectedGsmTexture = this.renderer['generateTexture'](
            this.createSectorCircle(TechnologyEnum.GSM, true, BlockModeEnum.NO_BLOCK),
        );

        this.selectedUmtsTexture = this.renderer['generateTexture'](
            this.createSectorCircle(TechnologyEnum.UMTS, true, BlockModeEnum.NO_BLOCK),
        );

        this.selectedLteTexture = this.renderer['generateTexture'](
            this.createSectorCircle(TechnologyEnum.LTE, true, BlockModeEnum.NO_BLOCK),
        );
    }

    private createSectorCircle(technology: TechnologyType, isSelected: boolean, blockMode: BlockModeEnum): PIXI.Graphics {
        const radius = this.getCircleRadius(technology);
        const rad = Math.PI / 180;
        const startAngle = rad;
        const endAngle = 60 * rad;
        const color = this.getCircleColor(technology, isSelected, blockMode);
        const outlineColor = this.getSectorOutlineColor(technology, isSelected, blockMode);
        return new PIXI.Graphics()
            .beginFill(color)
            .lineStyle(20, outlineColor)
            .moveTo(0, 0)
            .lineTo(0, 0)
            .arc(0, 0, radius, startAngle, endAngle)
            .lineTo(0, 0);
    }

    getCircleRadius(technology: TechnologyType): number {
        return SectorRadiusEnum[technology];
    }

    getCircleColor(technology: TechnologyType, isSelected: boolean, blockMode: BlockModeEnum): number {
        if (isSelected) {
            return 8092159;
        }
        switch (blockMode) {
            case BlockModeEnum.UC:
                return 15744290;
            case BlockModeEnum.CN:
                return 6316128;
            case BlockModeEnum.NO_BLOCK:
                return SectorColorEnum[technology];
        }
    }

    getSectorOutlineColor(technology: TechnologyType, isSelected: boolean, blockMode: BlockModeEnum): number {
        if (isSelected) {
            return 14276863;
        }
        switch (blockMode) {
            case BlockModeEnum.UC:
                return 15897733;
            case BlockModeEnum.CN:
                return 10526880;
        }
        return SectorOutlineColorEnum[technology];
    }

    createBaseStationCircle(): PIXI.Graphics {
        return new PIXI.Graphics().beginFill(2564064).lineStyle(0).drawCircle(0, 0, 150);
    }

    getTextureType(sector: SectorInterface): PIXI.Texture {
        let blockType: string;

        if (sector.blocked.UC) {
            blockType = BlockModeEnum.UC;
        } else if (sector.blocked.CN) {
            blockType = BlockModeEnum.CN;
        } else {
            blockType = BlockModeEnum.NO_BLOCK;
        }

        switch (blockType) {
            case BlockModeEnum.NO_BLOCK:
                switch (sector.technology) {
                    case TechnologyEnum.GSM:
                        return this.gsmTexture;
                    case TechnologyEnum.UMTS:
                        return this.umtsTexture;
                    case TechnologyEnum.LTE:
                        return this.lteTexture;
                }
                break;
            case BlockModeEnum.CN:
                switch (sector.technology) {
                    case TechnologyEnum.GSM:
                        return this.cnBlockedGsmTexture;
                    case TechnologyEnum.UMTS:
                        return this.cnBlockedUmtsTexture;
                    case TechnologyEnum.LTE:
                        return this.cnBlockedLteTexture;
                }
                break;
            case BlockModeEnum.UC:
                switch (sector.technology) {
                    case TechnologyEnum.GSM:
                        return this.unBlockedGsmTexture;
                    case TechnologyEnum.UMTS:
                        return this.unBlockedUmtsTexture;
                    case TechnologyEnum.LTE:
                        return this.unBlockedLteTexture;
                }
                break;
        }
    }

    drawMarkers(): void {
        if (this.sectors?.length) {
            for (const sector of this.sectors) {
                let sectorSprite!: PIXI.Sprite;
                switch (sector.technology) {
                    case TechnologyEnum.GSM:
                        sectorSprite = new PIXI.Sprite(this.getTextureType(sector));
                        sectorSprite.zIndex = 1;
                        break;
                    case TechnologyEnum.UMTS:
                        sectorSprite = new PIXI.Sprite(this.getTextureType(sector));
                        sectorSprite.zIndex = 3;
                        break;
                    case TechnologyEnum.LTE:
                        sectorSprite = new PIXI.Sprite(this.getTextureType(sector));
                        sectorSprite.zIndex = 5;
                        break;
                }
                const latLng: LatLngTuple = [sector.latitude, sector.longitude];
                const point = this.project(latLng);
                const baseStationSprite = new PIXI.Sprite(this.baseStationTexture);
                baseStationSprite.zIndex = 10;
                sectorSprite.angle = sector.azimut - 125;
                sectorSprite.x = baseStationSprite.x = point.x;
                sectorSprite.y = baseStationSprite.y = point.y;
                sectorSprite.accessibleTitle = sector.cell_name;
                sectorSprite.scale.set(0.0005);
                baseStationSprite.scale.set(0.0005);
                baseStationSprite.anchor.set(0.5);
                this.pixiContainer.addChild(sectorSprite, baseStationSprite);
            }
        }
        if (this.selectedSectors?.length) {
            for (const selectedSector of this.selectedSectors) {
                try {
                    let sectorSprite!: PIXI.Sprite;
                    switch (selectedSector.technology) {
                        case TechnologyEnum.GSM:
                            sectorSprite = new PIXI.Sprite(this.selectedGsmTexture);
                            sectorSprite.zIndex = 2;
                            break;
                        case TechnologyEnum.UMTS:
                            sectorSprite = new PIXI.Sprite(this.selectedUmtsTexture);
                            sectorSprite.zIndex = 4;
                            break;
                        case TechnologyEnum.LTE:
                            sectorSprite = new PIXI.Sprite(this.selectedLteTexture);
                            sectorSprite.zIndex = 6;
                            break;
                    }
                    const latLng: LatLngTuple = [selectedSector.latitude, selectedSector.longitude];
                    const point = this.project(latLng);
                    const baseStationSprite = new PIXI.Sprite(this.baseStationTexture);
                    baseStationSprite.zIndex = 10;
                    sectorSprite.angle = selectedSector.azimut - 125;
                    sectorSprite.x = baseStationSprite.x = point.x;
                    sectorSprite.y = baseStationSprite.y = point.y;
                    sectorSprite.accessibleTitle = selectedSector.cell_name;
                    sectorSprite.scale.set(0.0005);
                    baseStationSprite.scale.set(0.0005);
                    baseStationSprite.anchor.set(0.5);
                    this.pixiContainer.addChild(sectorSprite, baseStationSprite);
                } catch (e) {}
            }
        }
        if (this.searchedSectors?.length) {
            const searchPoints: LatLngExpression[] = this.searchedSectors.map((value) => [value.latitude, value.longitude]);
            const uniquePoints: LatLngExpression[] = [];
            for (const searchPoint of searchPoints) {
                if (uniquePoints.findIndex((value) => value[0] === searchPoint[0] && value[1] === searchPoint[1]) === -1) {
                    uniquePoints.push(searchPoint);
                }
            }
            for (const uniquePoint of uniquePoints) {
                const markerSprite = new PIXI.Sprite(this.pixiResources.marker.texture);
                const point = this.project([uniquePoint[0], uniquePoint[1]]);
                markerSprite.x = point.x;
                markerSprite.y = point.y;
                markerSprite.zIndex = 11;
                markerSprite.anchor.set(0.5);
                markerSprite.name = 'marker';
                markerSprite.scale.set(this.currentScale);
                this.pixiContainer.addChild(markerSprite);
            }
        }
    }

    drawAreas(geometries: MapAreaInterface[]): void {
        const layers: L.Layer[] = [];
        for (const geometry of geometries) {
            if (geometry.type === GeometryEnum.Circle) {
                const circle = new L.Circle(geometry.latlng).setRadius(geometry.radius);
                this.drawnItems.addLayer(circle);
                this.map.addLayer(circle);
                const _leaflet_id = circle['_leaflet_id'];
                this.addMapCircleLayer(_leaflet_id, geometry.radius, geometry.latlng, this.technologiesToView);
                layers.push(circle);
            }
            if (geometry.type === GeometryEnum.Polygon) {
                const polygon = new L.Polygon(geometry.latlngs);
                this.drawnItems.addLayer(polygon);
                this.map.addLayer(polygon);
                const _leaflet_id = polygon['_leaflet_id'];
                this.addMapPolygonLayer(_leaflet_id, geometry.latlngs, this.technologiesToView);
                layers.push(polygon);
            }
            if (geometry.type === GeometryEnum.Rectangle) {
                const bounds = [geometry.latlngs[0], geometry.latlngs[2]] as LatLngBoundsExpression;
                const rectangle = new L.Rectangle(bounds);
                this.drawnItems.addLayer(rectangle);
                this.map.addLayer(rectangle);
                const _leaflet_id = rectangle['_leaflet_id'];
                this.addRectangleLayer(_leaflet_id, geometry.latlngs, this.technologiesToView);
                layers.push(rectangle);
            }
        }
        const test: LatLngBoundsExpression = new L.FeatureGroup(layers).getBounds();
        this.fitBounds(test);
    }

    fitBounds(bounds: LatLngBoundsExpression): void {
        this.map.fitBounds(bounds, {
            maxZoom: 16,
            animate: true,
        });
    }

    calculateLatLngExpression(): LatLngExpression[] {
        const latLngBounds = this.map.getBounds();
        const latlngs = [];

        latlngs.push([latLngBounds.getSouthWest().lat, latLngBounds.getSouthWest().lng]); // bottom left
        latlngs.push([latLngBounds.getSouthEast().lat, latLngBounds.getSouthEast().lng]); // bottom right
        latlngs.push([latLngBounds.getNorthEast().lat, latLngBounds.getNorthEast().lng]); // top right
        latlngs.push([latLngBounds.getNorthWest().lat, latLngBounds.getNorthWest().lng]); // top left
        latlngs.push(latlngs[0]);
        return latlngs;
    }

    getBlockType = (blockType: BlockModeEnum): string => {
        switch (blockType) {
            case 'UC':
                return 'Безусловная';
            case 'CN':
                return 'Условная';
            default:
                return '';
        }
    };

    addSectorInfoPopup = (sector: CurrentSectorInterface): void => {
        const cnBlockedServices = sector.sector.blocked.CN || [];
        const ucBlockedServices = sector.sector.blocked.UC || [];

        let displayedTasks = '';
        const tasks = sector.sector.tasks.map((value) => value.id) || [];

        tasks.forEach((value) => {
            const url = location.origin + `/journal/tasks/${value}`;
            displayedTasks += `<a href=${url}>${value}</a>` + ' ';
        });

        this.sectorInfoPopup = new L.Popup({ closeButton: false })
            .setContent(
                'Базовые станции: ' +
                sector.sector.base_station_name +
                '<br/>' +
                'Тип блокировки: ' +
                this.getBlockType(sector.sector.blocked_type) +
                '<br />' +
                'Заблокированные сервисы: ' +
                cnBlockedServices +
                ' ' +
                ucBlockedServices +
                '<br />' +
                'Задания: ' +
                displayedTasks,
            )
            .setLatLng([sector.latlng.lat, sector.latlng.lng])
            .openOn(this.map);
    };

    removeSectorInfoPopup = (): void => {
        if (this.sectorInfoPopup) {
            this.map.removeLayer(this.sectorInfoPopup);
        }
    };

    @Dispatch()
    getSectors = (technologies: TechnologyType[], latlngs: LatLngExpression[]): GetSectorsByBounds =>
        new GetSectorsByBounds(technologies, latlngs);

    @Dispatch()
    getSectorsByPoint = (
        latLng: LatLngExpression,
        technologies: TechnologyType[] = this.technologiesToView,
    ): GetSectorsByPoint => new GetSectorsByPoint(latLng, technologies);

    @Dispatch()
    addMapCircleLayer = (
        id: number,
        radius: number,
        latlng: LatLngExpression,
        technologies: TechnologyType[],
    ): AddMapCircleLayer => new AddMapCircleLayer(id, radius, latlng, technologies);

    @Dispatch()
    addRectangleLayer = (id: number, latlngs: LatLngExpression[], technologies: TechnologyType[]): AddRectangleLayer =>
        new AddRectangleLayer(id, latlngs, technologies);

    @Dispatch()
    addMapPolygonLayer = (id: number, latlngs: LatLngExpression[], technologies: TechnologyType[]): AddMapPolygonLayer =>
        new AddMapPolygonLayer(id, latlngs, technologies);

    @Dispatch()
    removeLayers = (ids: number[]): RemoveLayers => new RemoveLayers(ids);

    @Dispatch()
    removeAllSelected = (): RemoveAllSelected => new RemoveAllSelected();

    ngOnInit(): void {
        this.mapDrawService.drawAreas.pipe(takeUntil(this.unSubscriber$)).subscribe((value) => {
            this.drawAreas(value);
        });
        this.mapDrawService.removeAreas.pipe(takeUntil(this.unSubscriber$)).subscribe((value) => {
            this.map.eachLayer((layer) => {
                const _leaflet_id = layer['_leaflet_id'];
                if (value.includes(_leaflet_id)) {
                    layer.remove();
                }
            });
        });
        this.mapDrawService.fitSector.pipe(takeUntil(this.unSubscriber$)).subscribe((value) => {
            this.map.setView([value.latitude, value.longitude], 18);
        });
        this.mapDrawService.fitSearchedSectors.pipe(takeUntil(this.unSubscriber$)).subscribe((value) => {
            const bounds: LatLngBounds = new L.FeatureGroup(
                value.map((value1) => L.marker([value1.latitude, value1.longitude])),
            ).getBounds();
            this.fitBounds(bounds);
        });
        this.mapDrawService.fitBounds.pipe(takeUntil(this.unSubscriber$)).subscribe((value) => this.fitBounds(value));

        const iconRetinaUrl = 'assets/leaflet/images/marker-icon-2x.png';
        const iconUrl = 'assets/leaflet/images/marker-icon.png';
        const shadowUrl = 'assets/leaflet/images/marker-shadow.png';
        L.Marker.prototype.options.icon = L.icon({
            iconRetinaUrl,
            iconUrl,
            shadowUrl,
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            tooltipAnchor: [16, -28],
            shadowSize: [41, 41],
        });
    }

    ngAfterViewInit(): void {
        this.initMap();
        this.technologiesToView$
            .pipe(
                takeUntil(this.unSubscriber$),
                filter((value) => !!value.length),
            )
            .subscribe(() => {
                if (this.map.getZoom() < 12) {
                    return;
                }

                const latlngs = this.calculateLatLngExpression();
                this.getSectors(this.technologiesToView, latlngs);
            });
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes.sectorInfo && changes.sectorInfo.currentValue) {
            const currentSector: CurrentSectorInterface = changes.sectorInfo.currentValue;
            const distanceTo = new L.Marker([currentSector.sector.latitude, currentSector.sector.longitude])
                .getLatLng()
                .distanceTo(currentSector.latlng);
            if (distanceTo < 13.6) {
                return;
            }
            this.addSectorInfoPopup(changes.sectorInfo.currentValue);
        }
    }

    ngOnDestroy(): void {
        this.unSubscriber$.next(true);
        this.unSubscriber$.complete();
        this.removeAllSelected();
    }
}
