import { enforceScriptIntegrity, SRIConfig } from '../src/enforceScriptIntegrity';

/**
 * Extended Window interface that includes SRI configuration
 */
interface SRIWindow extends Window {
  SRI?: {
    config: SRIConfig;
  };
}

describe("SRI Client", () => {
  let mockDocument: Document;

  /**
   * Helper function to create a mock script element
   */
  const createMockScript = (
    src: string | null,
    hasIntegrity = false,
  ): HTMLScriptElement =>
    ({
      nodeName: "SCRIPT",
      getAttribute: jest.fn().mockReturnValue(src),
      setAttribute: jest.fn(),
      hasAttribute: jest.fn().mockReturnValue(hasIntegrity),
    }) as unknown as HTMLScriptElement;

  beforeEach(() => {
    // Mock document
    mockDocument = {
      documentElement: {
        appendChild: jest.fn(),
        removeChild: jest.fn(),
      },
      querySelectorAll: jest.fn().mockReturnValue([]),
      // We'll patch createElement in each test
    } as unknown as Document;

    // Mock window
    global.document = mockDocument;
    global.window = {} as unknown as Window & typeof globalThis;
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Remove global mocks
    delete (global as any).window;
    delete (global as any).document;
  });

  describe("createElement override", () => {
    it("should not modify non-script elements", () => {
      (window as SRIWindow).SRI = {
        config: {
          "test.js": "sha384-test-hash",
        },
      };
      
      // Mock createElement to return a div
      (document as any).createElement = jest.fn().mockImplementation((tagName: string) => {
        return { tagName: "DIV", setAttribute: jest.fn() };
      });

      enforceScriptIntegrity((window as SRIWindow).SRI!.config);

      const div = document.createElement("div");
      expect(div.setAttribute).not.toHaveBeenCalled();
    });

    it("should not set integrity if script has no src", () => {
      (window as SRIWindow).SRI = {
        config: {
          "test.js": "sha384-test-hash",
        },
      };
      
      const mockScript = createMockScript(null);
      (document as any).createElement = jest.fn().mockReturnValue(mockScript);

      enforceScriptIntegrity((window as SRIWindow).SRI!.config);

      const script = document.createElement("script");
      expect(script.setAttribute).not.toHaveBeenCalled();
    });

    it("should not set integrity if no matching config", () => {
      (window as SRIWindow).SRI = {
        config: {
          "other.js": "sha384-test-hash",
        },
      };
      const mockScript = createMockScript("test.js");
      (document as any).createElement = jest.fn().mockReturnValue(mockScript);
      enforceScriptIntegrity((window as SRIWindow).SRI!.config);
      const script = document.createElement("script");
      expect(script.setAttribute).not.toHaveBeenCalled();
    });

    it("should not overwrite existing integrity attribute", () => {
      (window as SRIWindow).SRI = {
        config: {
          "test.js": "sha384-test-hash",
        },
      };
      const mockScript = createMockScript("test.js", true);
      (document as any).createElement = jest.fn().mockReturnValue(mockScript);
      enforceScriptIntegrity((window as SRIWindow).SRI!.config);
      const script = document.createElement("script");
      expect(script.setAttribute).not.toHaveBeenCalled();
    });
  });
});
