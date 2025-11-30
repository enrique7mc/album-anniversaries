import { Injectable, NgZone } from '@angular/core';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

@Injectable({
  providedIn: 'root',
})
export class GsapService {
  constructor(private ngZone: NgZone) {
    // Register GSAP plugins
    gsap.registerPlugin(ScrollTrigger);
  }

  /**
   * Runs a function outside Angular's zone for better performance
   * Prevents unnecessary change detection during animation frames
   */
  runOutsideAngular(callback: () => void): void {
    this.ngZone.runOutsideAngular(callback);
  }

  /**
   * Animate album grid entrance with staggered effect
   * @param gridElement The grid container element
   * @param delay Optional delay before animation starts (in seconds)
   */
  animateAlbumGrid(gridElement: HTMLElement, delay: number = 0): void {
    this.runOutsideAngular(() => {
      const albums = gridElement.querySelectorAll('.album-card-item');

      gsap.from(albums, {
        opacity: 0,
        y: 60,
        scale: 0.9,
        duration: 0.6,
        stagger: {
          amount: 0.8,
          from: 'start',
          ease: 'power2.out',
        },
        ease: 'power3.out',
        delay: delay,
        clearProps: 'all', // Clear inline styles after animation completes
      });
    });
  }

  /**
   * Create scroll-linked progress bar animation
   * @param progressBar The progress bar element
   */
  createScrollProgress(progressBar: HTMLElement): void {
    this.runOutsideAngular(() => {
      gsap.to(progressBar, {
        scaleX: 1,
        transformOrigin: 'left center',
        ease: 'none',
        scrollTrigger: {
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.3,
        },
      });
    });
  }

  /**
   * Animate 3D tilt effect on an element
   * @param element The element to tilt
   * @param rotateX Rotation on X axis (degrees)
   * @param rotateY Rotation on Y axis (degrees)
   * @param duration Animation duration (seconds)
   */
  tilt3D(
    element: HTMLElement,
    rotateX: number,
    rotateY: number,
    duration: number = 0.3,
  ): void {
    this.runOutsideAngular(() => {
      gsap.to(element, {
        rotateX: rotateX,
        rotateY: rotateY,
        duration: duration,
        ease: 'power2.out',
        transformPerspective: 1000,
      });
    });
  }

  /**
   * Reset 3D tilt to neutral position
   * @param element The element to reset
   * @param duration Animation duration (seconds)
   */
  resetTilt3D(element: HTMLElement, duration: number = 0.5): void {
    this.runOutsideAngular(() => {
      gsap.to(element, {
        rotateX: 0,
        rotateY: 0,
        duration: duration,
        ease: 'power2.out',
      });
    });
  }

  /**
   * Kill all ScrollTrigger instances
   * Call this in ngOnDestroy to prevent memory leaks
   */
  killAllScrollTriggers(): void {
    ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
  }

  /**
   * Kill specific ScrollTrigger instances by ID prefix
   * @param idPrefix The ID prefix to match (e.g., 'component-name-')
   */
  killScrollTriggersByPrefix(idPrefix: string): void {
    ScrollTrigger.getAll().forEach((trigger) => {
      if (trigger.vars.id?.startsWith(idPrefix)) {
        trigger.kill();
      }
    });
  }
}
