import { TestBed } from '@angular/core/testing';
import { MusicKitLoaderService } from './musickit-loader.service';

describe('MusicKitLoaderService', () => {
  let service: MusicKitLoaderService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MusicKitLoaderService);
  });

  afterEach(() => {
    // Clean up any MusicKit mock
    delete (window as any).MusicKit;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('loadMusicKit should return a promise', () => {
    // Create a new service instance to avoid singleton caching
    const freshService = new MusicKitLoaderService();
    const result = freshService.loadMusicKit();
    expect(result).toBeInstanceOf(Promise);
  });

  it('should return same promise on multiple loadMusicKit calls (singleton)', () => {
    // Create a fresh service instance
    const freshService = new MusicKitLoaderService();

    const promise1 = freshService.loadMusicKit();
    const promise2 = freshService.loadMusicKit();
    const promise3 = freshService.loadMusicKit();

    expect(promise1).toBe(promise2);
    expect(promise2).toBe(promise3);
  });

  it('should resolve immediately if window.MusicKit already exists', async () => {
    // Mock MusicKit already being loaded
    (window as any).MusicKit = {
      configure: jasmine.createSpy('configure'),
      getInstance: jasmine.createSpy('getInstance'),
    };

    // Create a fresh service to test the early return path
    const freshService = new MusicKitLoaderService();
    const promise = freshService.loadMusicKit();

    // Should resolve immediately without loading script
    await expectAsync(promise).toBeResolved();
  });

  it('should create script element with correct src URL', () => {
    // Spy on document.body.appendChild to capture the script element
    const appendChildSpy = spyOn(
      document.body,
      'appendChild',
    ).and.callThrough();

    // Create fresh service to avoid singleton caching
    const freshService = new MusicKitLoaderService();
    freshService.loadMusicKit();

    expect(appendChildSpy).toHaveBeenCalled();

    const scriptElement = appendChildSpy.calls.mostRecent()
      .args[0] as HTMLScriptElement;
    expect(scriptElement.tagName).toBe('SCRIPT');
    expect(scriptElement.src).toBe(
      'https://js-cdn.music.apple.com/musickit/v3/musickit.js',
    );
    expect(scriptElement.async).toBe(true);
  });

  it('should resolve when musickitloaded event fires', async () => {
    // Create fresh service
    const freshService = new MusicKitLoaderService();
    const promise = freshService.loadMusicKit();

    // Simulate MusicKit loaded event
    document.dispatchEvent(new Event('musickitloaded'));

    await expectAsync(promise).toBeResolved();
  });
});
