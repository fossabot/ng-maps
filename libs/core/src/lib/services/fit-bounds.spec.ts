import {
  discardPeriodicTasks,
  fakeAsync,
  TestBed,
  tick,
} from '@angular/core/testing';
import { first } from 'rxjs/operators';

import { FitBoundsService } from './fit-bounds';
import { MapsAPILoader } from './maps-api-loader/maps-api-loader';

describe('FitBoundsService', () => {
  let loader: MapsAPILoader;
  let fitBoundsService: FitBoundsService;
  let latLngBoundsConstructs: number;
  // @ts-ignore
  let latLngBoundsExtend: jasmine.Spy;

  beforeEach(fakeAsync(() => {
    loader = {
      load: jasmine.createSpy().and.returnValue(Promise.resolve()),
      _window: window,
      _document: document,
    } as any;

    latLngBoundsConstructs = 0;
    latLngBoundsExtend = jasmine.createSpy();

    (window as any).google = {
      maps: {
        LatLngBounds: class LatLngBounds {
          public extend = latLngBoundsExtend;

          constructor() {
            latLngBoundsConstructs += 1;
          }
        },
      },
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: MapsAPILoader, useValue: loader },
        FitBoundsService,
      ],
    });

    fitBoundsService = TestBed.get(FitBoundsService);
    tick();
  }));

  it('should wait for the load event', () => {
    expect(loader.load).toHaveBeenCalledTimes(1);
    expect(latLngBoundsConstructs).toEqual(0);
  });

  it('should emit empty bounds when API finished loaded but the are not entries in the includeInBounds$ map', fakeAsync(() => {
    // @ts-ignore
    const success = jasmine.createSpy();
    fitBoundsService.getBounds$().pipe(first()).subscribe(success);
    tick();
    expect(success).toHaveBeenCalledTimes(1);
    discardPeriodicTasks();
  }));

  it('should emit the new bounds every 200ms by default', fakeAsync(() => {
    // @ts-ignore
    const success = jasmine.createSpy();
    fitBoundsService.getBounds$().subscribe(success);
    tick(1);
    fitBoundsService.addToBounds({ lat: 2, lng: 2 });
    fitBoundsService.addToBounds({ lat: 2, lng: 2 });
    fitBoundsService.addToBounds({ lat: 3, lng: 3 });
    expect(success).toHaveBeenCalledTimes(1);
    tick(150);
    expect(success).toHaveBeenCalledTimes(1);
    tick(200);
    expect(success).toHaveBeenCalledTimes(2);
    discardPeriodicTasks();
  }));

  it('should provide all latLng to the bounds', fakeAsync(() => {
    // @ts-ignore
    const success = jasmine.createSpy();
    fitBoundsService.getBounds$().subscribe(success);
    tick(1);
    const latLngs = [
      { lat: 2, lng: 2 },
      { lat: 3, lng: 3 },
      { lat: 4, lng: 4 },
    ];
    fitBoundsService.addToBounds(latLngs[0]);
    fitBoundsService.addToBounds(latLngs[1]);
    fitBoundsService.addToBounds(latLngs[2]);
    expect(latLngBoundsExtend).toHaveBeenCalledTimes(0);
    tick(200);
    expect(latLngBoundsExtend).toHaveBeenCalledTimes(3);
    expect(latLngBoundsExtend).toHaveBeenCalledWith(latLngs[0]);
    expect(latLngBoundsExtend).toHaveBeenCalledWith(latLngs[1]);
    expect(latLngBoundsExtend).toHaveBeenCalledWith(latLngs[2]);
    discardPeriodicTasks();
  }));

  it('should remove latlng from bounds and emit the new bounds after the sample time', fakeAsync(() => {
    // @ts-ignore
    const success = jasmine.createSpy();
    fitBoundsService.getBounds$().subscribe(success);
    tick(1);
    fitBoundsService.addToBounds({ lat: 2, lng: 2 });
    fitBoundsService.addToBounds({ lat: 3, lng: 3 });
    tick(200);
    // @ts-ignore
    latLngBoundsExtend.calls.reset();

    fitBoundsService.removeFromBounds({ lat: 2, lng: 2 });
    fitBoundsService.removeFromBounds({ lat: 3, lng: 3 });
    tick(150);
    expect(latLngBoundsExtend).toHaveBeenCalledTimes(0);
    tick(200);

    expect(latLngBoundsExtend).toHaveBeenCalledTimes(0);
    discardPeriodicTasks();
  }));

  it('should use the new _boundsChangeSampleTime$ for all next bounds', fakeAsync(() => {
    // @ts-ignore
    const success = jasmine.createSpy();
    fitBoundsService.getBounds$().subscribe(success);
    tick(1);
    fitBoundsService.addToBounds({ lat: 2, lng: 2 });
    fitBoundsService.addToBounds({ lat: 3, lng: 3 });
    tick(200);
    success.calls.reset();

    fitBoundsService.changeFitBoundsChangeSampleTime(100);
    fitBoundsService.removeFromBounds({ lat: 2, lng: 2 });
    fitBoundsService.removeFromBounds({ lat: 3, lng: 3 });
    tick(100);

    expect(success).toHaveBeenCalledTimes(1);
    discardPeriodicTasks();
  }));
});
