import {
  Directive,
  OnInit,
  OnDestroy,
  Renderer2,
  NgZone,
  HostListener,
} from '@angular/core';
import { GsapService } from './gsap.service';
import gsap from 'gsap';

@Directive({
  selector: '[appCustomCursor]',
})
export class CustomCursorDirective implements OnInit, OnDestroy {
  private cursorElement: HTMLElement;
  private cursorX = 0;
  private cursorY = 0;
  private isHovering = false;
  private animationFrame: number;

  constructor(
    private renderer: Renderer2,
    private gsapService: GsapService,
    private ngZone: NgZone,
  ) {}

  ngOnInit(): void {
    // Only enable custom cursor on desktop
    if (window.innerWidth <= 768) {
      return;
    }

    // Initialize cursor position to center of screen
    this.cursorX = window.innerWidth / 2;
    this.cursorY = window.innerHeight / 2;

    this.createCursor();
    this.startCursorAnimation();
  }

  /**
   * Creates the custom cursor element and adds it to the DOM
   */
  private createCursor(): void {
    this.cursorElement = this.renderer.createElement('div');
    this.renderer.addClass(this.cursorElement, 'custom-cursor');
    this.renderer.appendChild(document.body, this.cursorElement);
    this.renderer.addClass(document.body, 'custom-cursor-active');

    // Set initial position to avoid cursor appearing at (0,0)
    this.renderer.setStyle(this.cursorElement, 'opacity', '0');

    // Show cursor after a brief delay to ensure proper initialization
    setTimeout(() => {
      if (this.cursorElement) {
        this.renderer.setStyle(this.cursorElement, 'opacity', '1');
      }
    }, 100);
  }

  /**
   * Tracks mouse movement and updates cursor position
   */
  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (!this.cursorElement) return;

    this.cursorX = event.clientX;
    this.cursorY = event.clientY;
  }

  /**
   * Detects hover over interactive elements
   */
  @HostListener('document:mouseover', ['$event'])
  onMouseOver(event: MouseEvent): void {
    if (!this.cursorElement) return;

    const target = event.target as HTMLElement;

    // Check if hovering over interactive elements
    if (
      target.closest('.album-card-item') ||
      target.closest('button') ||
      target.closest('a') ||
      target.closest('.filter-btn')
    ) {
      if (!this.isHovering) {
        this.isHovering = true;
        this.renderer.addClass(this.cursorElement, 'hover');

        // Animate cursor scale
        this.gsapService.runOutsideAngular(() => {
          gsap.to(this.cursorElement, {
            scale: 2,
            duration: 0.3,
            ease: 'power2.out',
          });
        });
      }
    }
  }

  /**
   * Detects mouse leaving interactive elements
   */
  @HostListener('document:mouseout', ['$event'])
  onMouseOut(event: MouseEvent): void {
    if (!this.cursorElement) return;

    const target = event.target as HTMLElement;

    if (
      target.closest('.album-card-item') ||
      target.closest('button') ||
      target.closest('a') ||
      target.closest('.filter-btn')
    ) {
      if (this.isHovering) {
        this.isHovering = false;
        this.renderer.removeClass(this.cursorElement, 'hover');

        // Reset cursor scale
        this.gsapService.runOutsideAngular(() => {
          gsap.to(this.cursorElement, {
            scale: 1,
            duration: 0.3,
            ease: 'power2.out',
          });
        });
      }
    }
  }

  /**
   * Starts the cursor animation loop using GSAP
   */
  private startCursorAnimation(): void {
    this.gsapService.runOutsideAngular(() => {
      // Smooth cursor follow animation
      const updateCursor = () => {
        gsap.to(this.cursorElement, {
          x: this.cursorX - 10, // Center the cursor (20px / 2)
          y: this.cursorY - 10,
          duration: 0.2,
          ease: 'power2.out',
        });

        this.animationFrame = requestAnimationFrame(updateCursor);
      };

      updateCursor();
    });
  }

  ngOnDestroy(): void {
    // Cancel animation frame
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }

    // Remove cursor element from DOM
    if (this.cursorElement) {
      this.renderer.removeChild(document.body, this.cursorElement);
      this.renderer.removeClass(document.body, 'custom-cursor-active');
    }
  }
}
