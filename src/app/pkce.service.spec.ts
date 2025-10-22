import { TestBed } from '@angular/core/testing';
import { PkceService } from './pkce.service';

describe('PkceService', () => {
  let service: PkceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PkceService);
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('generateCodeVerifier', () => {
    it('should generate a code verifier with default length of 128', () => {
      const verifier = service.generateCodeVerifier();
      expect(verifier.length).toBe(128);
    });

    it('should generate a code verifier with custom length', () => {
      const verifier = service.generateCodeVerifier(64);
      expect(verifier.length).toBe(64);
    });

    it('should generate different verifiers on each call', () => {
      const verifier1 = service.generateCodeVerifier();
      const verifier2 = service.generateCodeVerifier();
      expect(verifier1).not.toBe(verifier2);
    });

    it('should only use allowed characters (A-Z, a-z, 0-9, -, ., _, ~)', () => {
      const verifier = service.generateCodeVerifier();
      const allowedPattern = /^[A-Za-z0-9\-._~]+$/;
      expect(verifier).toMatch(allowedPattern);
    });
  });

  describe('generateCodeChallenge', () => {
    it('should generate a code challenge from a verifier', async () => {
      const verifier = 'test-verifier-string';
      const challenge = await service.generateCodeChallenge(verifier);
      expect(challenge).toBeTruthy();
      expect(typeof challenge).toBe('string');
    });

    it('should generate consistent challenges for the same verifier', async () => {
      const verifier = 'test-verifier-string';
      const challenge1 = await service.generateCodeChallenge(verifier);
      const challenge2 = await service.generateCodeChallenge(verifier);
      expect(challenge1).toBe(challenge2);
    });

    it('should generate different challenges for different verifiers', async () => {
      const challenge1 = await service.generateCodeChallenge('verifier1');
      const challenge2 = await service.generateCodeChallenge('verifier2');
      expect(challenge1).not.toBe(challenge2);
    });

    it('should generate base64url encoded string without padding', async () => {
      const verifier = 'test-verifier-string';
      const challenge = await service.generateCodeChallenge(verifier);
      expect(challenge).not.toContain('=');
      expect(challenge).not.toContain('+');
      expect(challenge).not.toContain('/');
    });
  });

  describe('storeCodeVerifier', () => {
    it('should store code verifier in sessionStorage', () => {
      const verifier = 'test-verifier';
      service.storeCodeVerifier(verifier);
      expect(sessionStorage.getItem('spotify_code_verifier')).toBe(verifier);
    });
  });

  describe('getCodeVerifier', () => {
    it('should retrieve stored code verifier', () => {
      const verifier = 'test-verifier';
      sessionStorage.setItem('spotify_code_verifier', verifier);
      expect(service.getCodeVerifier()).toBe(verifier);
    });

    it('should return null if no verifier is stored', () => {
      expect(service.getCodeVerifier()).toBeNull();
    });
  });

  describe('clearCodeVerifier', () => {
    it('should remove code verifier from sessionStorage', () => {
      sessionStorage.setItem('spotify_code_verifier', 'test-verifier');
      service.clearCodeVerifier();
      expect(sessionStorage.getItem('spotify_code_verifier')).toBeNull();
    });
  });
});
