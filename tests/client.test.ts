import { enforceScriptIntegrity } from "../src/client";

/**
 * Extended Window interface that includes SRI configuration
 */
interface SRIWindow extends Window {
  SRI?: {
    config: Record<string, string>;
  };
}

/**
 * Test suite for the SRI client functionality
 */
describe("SRI Client", () => {
  let mockDocument: Document;
  let mockObserver: MutationObserver;
  let mockCallback: (mutations: MutationRecord[]) => void;

  /**
   * Helper function to create a mock NodeList
   */
  const createMockNodeList = (nodes: Node[]): NodeList =>
    ({
      length: nodes.length,
      item: (index: number) => nodes[index] || null,
      forEach: (callback: (node: Node) => void) => nodes.forEach(callback),
      entries: () => [][Symbol.iterator](),
      keys: () => [][Symbol.iterator](),
      values: () => [][Symbol.iterator](),
      [Symbol.iterator]: function* () {
        yield* nodes;
      },
    }) as unknown as NodeList;

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

  /**
   * Helper function to create a mock mutation record
   */
  const createMockMutation = (addedNodes: NodeList): MutationRecord =>
    ({
      type: "childList",
      addedNodes,
      removedNodes: createMockNodeList([]),
      target: document.documentElement,
      attributeName: null,
      attributeNamespace: null,
      nextSibling: null,
      previousSibling: null,
      oldValue: null,
    }) as MutationRecord;

  beforeEach(() => {
    // Mock MutationObserver
    mockCallback = jest.fn();
    mockObserver = {
      observe: jest.fn(),
      disconnect: jest.fn(),
      takeRecords: jest.fn(),
    };
    global.MutationObserver = jest.fn().mockImplementation((callback) => {
      mockCallback = callback;
      return mockObserver;
    });

    // Mock document
    mockDocument = {
      documentElement: {
        appendChild: jest.fn(),
        removeChild: jest.fn(),
      },
      querySelectorAll: jest.fn().mockReturnValue([]),
      createElement: jest.fn().mockImplementation((tagName) => ({
        tagName: tagName.toUpperCase(),
        setAttribute: jest.fn(),
        getAttribute: jest.fn(),
        hasAttribute: jest.fn(),
      })),
    } as unknown as Document;

    // Mock window
    global.document = mockDocument;
    global.window = {
      SRI: {
        config: {
          "test.js": "sha384-test-hash",
        },
      },
    } as unknown as Window & typeof globalThis;
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Remove global mocks
    delete (global as any).window;
    delete (global as any).document;
  });

  describe("initialization", () => {
    it("should start observing document when initialized", () => {
      // Ensure window.SRI is defined
      (window as SRIWindow).SRI = {
        config: {
          "test.js": "sha384-test-hash",
        },
      };
      enforceScriptIntegrity((window as unknown as SRIWindow).SRI!.config);

      expect(mockObserver.observe).toHaveBeenCalledWith(
        document.documentElement,
        {
          childList: true,
          subtree: true,
        },
      );
    });

    it("should process existing scripts on initialization", () => {
      const mockScripts = [createMockScript("test.js")];

      (document.querySelectorAll as jest.Mock).mockReturnValue(mockScripts);

      enforceScriptIntegrity((window as unknown as SRIWindow).SRI!.config);

      expect(mockScripts[0].setAttribute).toHaveBeenCalledWith(
        "integrity",
        "sha384-test-hash",
      );
      expect(mockScripts[0].setAttribute).toHaveBeenCalledWith(
        "crossorigin",
        "anonymous",
      );
    });
  });

  describe("mutation handling", () => {
    it("should add integrity to new script tags", () => {
      enforceScriptIntegrity((window as unknown as SRIWindow).SRI!.config);

      const mockScript = createMockScript("test.js");
      const mockNodeList = createMockNodeList([mockScript]);
      const mutation = createMockMutation(mockNodeList);

      mockCallback([mutation]);

      expect(mockScript.setAttribute).toHaveBeenCalledWith(
        "integrity",
        "sha384-test-hash",
      );
      expect(mockScript.setAttribute).toHaveBeenCalledWith(
        "crossorigin",
        "anonymous",
      );
    });

    it("should not modify scripts without src attribute", () => {
      enforceScriptIntegrity((window as unknown as SRIWindow).SRI!.config);

      const mockScript = createMockScript(null);
      const mockNodeList = createMockNodeList([mockScript]);
      const mutation = createMockMutation(mockNodeList);

      mockCallback([mutation]);

      expect(mockScript.setAttribute).not.toHaveBeenCalled();
    });

    it("should not modify scripts that already have integrity", () => {
      enforceScriptIntegrity((window as unknown as SRIWindow).SRI!.config);

      const mockScript = createMockScript("test.js", true);
      const mockNodeList = createMockNodeList([mockScript]);
      const mutation = createMockMutation(mockNodeList);

      mockCallback([mutation]);

      expect(mockScript.setAttribute).not.toHaveBeenCalled();
    });
  });

  describe("script processing", () => {
    it("should extract filename from full path", () => {
      enforceScriptIntegrity((window as unknown as SRIWindow).SRI!.config);

      const mockScript = createMockScript("/path/to/test.js");
      const mockNodeList = createMockNodeList([mockScript]);
      const mutation = createMockMutation(mockNodeList);

      mockCallback([mutation]);

      expect(mockScript.setAttribute).toHaveBeenCalledWith(
        "integrity",
        "sha384-test-hash",
      );
      expect(mockScript.setAttribute).toHaveBeenCalledWith(
        "crossorigin",
        "anonymous",
      );
    });

    it("should handle scripts with no matching hash", () => {
      enforceScriptIntegrity((window as unknown as SRIWindow).SRI!.config);

      const mockScript = createMockScript("unknown.js");
      const mockNodeList = createMockNodeList([mockScript]);
      const mutation = createMockMutation(mockNodeList);

      mockCallback([mutation]);

      expect(mockScript.setAttribute).not.toHaveBeenCalled();
    });
  });
});
