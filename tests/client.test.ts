import { SRIEnforcer } from '../src/client';

describe('SRIEnforcer', () => {
  let mockDocument: Document;
  let mockObserver: MutationObserver;
  let mockCallback: (mutations: MutationRecord[]) => void;

  beforeEach(() => {
    // Mock MutationObserver
    mockCallback = jest.fn();
    mockObserver = {
      observe: jest.fn(),
      disconnect: jest.fn(),
      takeRecords: jest.fn()
    };
    global.MutationObserver = jest.fn().mockImplementation((callback) => {
      mockCallback = callback;
      return mockObserver;
    });

    // Mock document
    mockDocument = {
      documentElement: {
        appendChild: jest.fn(),
        removeChild: jest.fn()
      },
      getElementsByTagName: jest.fn().mockReturnValue([]),
      createElement: jest.fn().mockImplementation((tagName) => ({
        tagName: tagName.toUpperCase(),
        setAttribute: jest.fn(),
        getAttribute: jest.fn(),
        hasAttribute: jest.fn()
      }))
    } as unknown as Document;

    // Mock window
    global.document = mockDocument;
    global.window = {
      SRI: {
        config: {
          'test.js': 'sha384-test-hash'
        }
      }
    } as unknown as Window & typeof globalThis;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should start observing document when initialized', () => {
      new SRIEnforcer(window.SRI.config);
      
      expect(mockObserver.observe).toHaveBeenCalledWith(
        document.documentElement,
        {
          childList: true,
          subtree: true
        }
      );
    });

    it('should process existing scripts on initialization', () => {
      const mockScripts = [
        {
          tagName: 'SCRIPT',
          getAttribute: jest.fn().mockReturnValue('test.js'),
          setAttribute: jest.fn(),
          hasAttribute: jest.fn().mockReturnValue(false)
        }
      ];

      (document.getElementsByTagName as jest.Mock).mockReturnValue(mockScripts);

      new SRIEnforcer(window.SRI.config);

      expect(mockScripts[0].setAttribute).toHaveBeenCalledWith('integrity', 'sha384-test-hash');
      expect(mockScripts[0].setAttribute).toHaveBeenCalledWith('crossorigin', 'anonymous');
    });
  });

  describe('mutation handling', () => {
    it('should add integrity to new script tags', () => {
      const enforcer = new SRIEnforcer(window.SRI.config);
      
      const mockScript = {
        tagName: 'SCRIPT',
        getAttribute: jest.fn().mockReturnValue('test.js'),
        setAttribute: jest.fn(),
        hasAttribute: jest.fn().mockReturnValue(false),
        // Node interface implementation
        baseURI: '',
        childNodes: {
          length: 0,
          item: () => null,
          forEach: () => {},
          entries: () => [][Symbol.iterator](),
          keys: () => [][Symbol.iterator](),
          values: () => [][Symbol.iterator](),
          [Symbol.iterator]: function* () {}
        } as unknown as NodeList,
        firstChild: null,
        isConnected: true,
        lastChild: null,
        nextSibling: null,
        nodeName: 'SCRIPT',
        nodeType: 1,
        nodeValue: null,
        ownerDocument: mockDocument,
        parentElement: document.documentElement,
        parentNode: document.documentElement,
        previousSibling: null,
        textContent: '',
        appendChild: jest.fn(),
        cloneNode: jest.fn(),
        compareDocumentPosition: jest.fn(),
        contains: jest.fn(),
        getRootNode: jest.fn(),
        hasChildNodes: jest.fn(),
        insertBefore: jest.fn(),
        isDefaultNamespace: jest.fn(),
        isEqualNode: jest.fn(),
        isSameNode: jest.fn(),
        lookupNamespaceURI: jest.fn(),
        lookupPrefix: jest.fn(),
        normalize: jest.fn(),
        removeChild: jest.fn(),
        replaceChild: jest.fn()
      } as unknown as HTMLScriptElement;

      const mockNodeList = {
        length: 1,
        item: (index: number) => index === 0 ? mockScript : null,
        forEach: (callback: (node: Node, index: number) => void) => callback(mockScript, 0),
        entries: () => [[0, mockScript]][Symbol.iterator](),
        keys: () => [0][Symbol.iterator](),
        values: () => [mockScript][Symbol.iterator](),
        [Symbol.iterator]: function* () {
          yield mockScript;
        }
      } as unknown as NodeList;

      const emptyNodeList = {
        length: 0,
        item: () => null,
        forEach: () => {},
        entries: () => [][Symbol.iterator](),
        keys: () => [][Symbol.iterator](),
        values: () => [][Symbol.iterator](),
        [Symbol.iterator]: function* () {}
      } as unknown as NodeList;

      const mutation = {
        type: 'childList',
        addedNodes: mockNodeList,
        removedNodes: emptyNodeList,
        target: document.documentElement,
        attributeName: null,
        attributeNamespace: null,
        nextSibling: null,
        previousSibling: null,
        oldValue: null
      } as MutationRecord;

      mockCallback([mutation]);

      expect(mockScript.setAttribute).toHaveBeenCalledWith('integrity', 'sha384-test-hash');
      expect(mockScript.setAttribute).toHaveBeenCalledWith('crossorigin', 'anonymous');
    });

    it('should not modify scripts without src attribute', () => {
      const enforcer = new SRIEnforcer(window.SRI.config);
      
      const mockScript = {
        tagName: 'SCRIPT',
        getAttribute: jest.fn().mockReturnValue(null),
        setAttribute: jest.fn(),
        hasAttribute: jest.fn().mockReturnValue(false),
        // Node interface implementation
        baseURI: '',
        childNodes: {
          length: 0,
          item: () => null,
          forEach: () => {},
          entries: () => [][Symbol.iterator](),
          keys: () => [][Symbol.iterator](),
          values: () => [][Symbol.iterator](),
          [Symbol.iterator]: function* () {}
        } as unknown as NodeList,
        firstChild: null,
        isConnected: true,
        lastChild: null,
        nextSibling: null,
        nodeName: 'SCRIPT',
        nodeType: 1,
        nodeValue: null,
        ownerDocument: mockDocument,
        parentElement: document.documentElement,
        parentNode: document.documentElement,
        previousSibling: null,
        textContent: '',
        appendChild: jest.fn(),
        cloneNode: jest.fn(),
        compareDocumentPosition: jest.fn(),
        contains: jest.fn(),
        getRootNode: jest.fn(),
        hasChildNodes: jest.fn(),
        insertBefore: jest.fn(),
        isDefaultNamespace: jest.fn(),
        isEqualNode: jest.fn(),
        isSameNode: jest.fn(),
        lookupNamespaceURI: jest.fn(),
        lookupPrefix: jest.fn(),
        normalize: jest.fn(),
        removeChild: jest.fn(),
        replaceChild: jest.fn()
      } as unknown as HTMLScriptElement;

      const mockNodeList = {
        length: 1,
        item: (index: number) => index === 0 ? mockScript : null,
        forEach: (callback: (node: Node, index: number) => void) => callback(mockScript, 0),
        entries: () => [[0, mockScript]][Symbol.iterator](),
        keys: () => [0][Symbol.iterator](),
        values: () => [mockScript][Symbol.iterator](),
        [Symbol.iterator]: function* () {
          yield mockScript;
        }
      } as unknown as NodeList;

      const emptyNodeList = {
        length: 0,
        item: () => null,
        forEach: () => {},
        entries: () => [][Symbol.iterator](),
        keys: () => [][Symbol.iterator](),
        values: () => [][Symbol.iterator](),
        [Symbol.iterator]: function* () {}
      } as unknown as NodeList;

      const mutation = {
        type: 'childList',
        addedNodes: mockNodeList,
        removedNodes: emptyNodeList,
        target: document.documentElement,
        attributeName: null,
        attributeNamespace: null,
        nextSibling: null,
        previousSibling: null,
        oldValue: null
      } as MutationRecord;

      mockCallback([mutation]);

      expect(mockScript.setAttribute).not.toHaveBeenCalled();
    });

    it('should not modify scripts that already have integrity', () => {
      const enforcer = new SRIEnforcer(window.SRI.config);
      
      const mockScript = {
        tagName: 'SCRIPT',
        getAttribute: jest.fn().mockReturnValue('test.js'),
        setAttribute: jest.fn(),
        hasAttribute: jest.fn().mockReturnValue(true),
        // Node interface implementation
        baseURI: '',
        childNodes: {
          length: 0,
          item: () => null,
          forEach: () => {},
          entries: () => [][Symbol.iterator](),
          keys: () => [][Symbol.iterator](),
          values: () => [][Symbol.iterator](),
          [Symbol.iterator]: function* () {}
        } as unknown as NodeList,
        firstChild: null,
        isConnected: true,
        lastChild: null,
        nextSibling: null,
        nodeName: 'SCRIPT',
        nodeType: 1,
        nodeValue: null,
        ownerDocument: mockDocument,
        parentElement: document.documentElement,
        parentNode: document.documentElement,
        previousSibling: null,
        textContent: '',
        appendChild: jest.fn(),
        cloneNode: jest.fn(),
        compareDocumentPosition: jest.fn(),
        contains: jest.fn(),
        getRootNode: jest.fn(),
        hasChildNodes: jest.fn(),
        insertBefore: jest.fn(),
        isDefaultNamespace: jest.fn(),
        isEqualNode: jest.fn(),
        isSameNode: jest.fn(),
        lookupNamespaceURI: jest.fn(),
        lookupPrefix: jest.fn(),
        normalize: jest.fn(),
        removeChild: jest.fn(),
        replaceChild: jest.fn()
      } as unknown as HTMLScriptElement;

      const mockNodeList = {
        length: 1,
        item: (index: number) => index === 0 ? mockScript : null,
        forEach: (callback: (node: Node, index: number) => void) => callback(mockScript, 0),
        entries: () => [[0, mockScript]][Symbol.iterator](),
        keys: () => [0][Symbol.iterator](),
        values: () => [mockScript][Symbol.iterator](),
        [Symbol.iterator]: function* () {
          yield mockScript;
        }
      } as unknown as NodeList;

      const emptyNodeList = {
        length: 0,
        item: () => null,
        forEach: () => {},
        entries: () => [][Symbol.iterator](),
        keys: () => [][Symbol.iterator](),
        values: () => [][Symbol.iterator](),
        [Symbol.iterator]: function* () {}
      } as unknown as NodeList;

      const mutation = {
        type: 'childList',
        addedNodes: mockNodeList,
        removedNodes: emptyNodeList,
        target: document.documentElement,
        attributeName: null,
        attributeNamespace: null,
        nextSibling: null,
        previousSibling: null,
        oldValue: null
      } as MutationRecord;

      mockCallback([mutation]);

      expect(mockScript.setAttribute).not.toHaveBeenCalled();
    });
  });

  describe('script processing', () => {
    it('should extract filename from full path', () => {
      const enforcer = new SRIEnforcer(window.SRI.config);
      
      const mockScript = {
        tagName: 'SCRIPT',
        getAttribute: jest.fn().mockReturnValue('/path/to/test.js'),
        setAttribute: jest.fn(),
        hasAttribute: jest.fn().mockReturnValue(false),
        // Node interface implementation
        baseURI: '',
        childNodes: {
          length: 0,
          item: () => null,
          forEach: () => {},
          entries: () => [][Symbol.iterator](),
          keys: () => [][Symbol.iterator](),
          values: () => [][Symbol.iterator](),
          [Symbol.iterator]: function* () {}
        } as unknown as NodeList,
        firstChild: null,
        isConnected: true,
        lastChild: null,
        nextSibling: null,
        nodeName: 'SCRIPT',
        nodeType: 1,
        nodeValue: null,
        ownerDocument: mockDocument,
        parentElement: document.documentElement,
        parentNode: document.documentElement,
        previousSibling: null,
        textContent: '',
        appendChild: jest.fn(),
        cloneNode: jest.fn(),
        compareDocumentPosition: jest.fn(),
        contains: jest.fn(),
        getRootNode: jest.fn(),
        hasChildNodes: jest.fn(),
        insertBefore: jest.fn(),
        isDefaultNamespace: jest.fn(),
        isEqualNode: jest.fn(),
        isSameNode: jest.fn(),
        lookupNamespaceURI: jest.fn(),
        lookupPrefix: jest.fn(),
        normalize: jest.fn(),
        removeChild: jest.fn(),
        replaceChild: jest.fn()
      } as unknown as HTMLScriptElement;

      const mockNodeList = {
        length: 1,
        item: (index: number) => index === 0 ? mockScript : null,
        forEach: (callback: (node: Node, index: number) => void) => callback(mockScript, 0),
        entries: () => [[0, mockScript]][Symbol.iterator](),
        keys: () => [0][Symbol.iterator](),
        values: () => [mockScript][Symbol.iterator](),
        [Symbol.iterator]: function* () {
          yield mockScript;
        }
      } as unknown as NodeList;

      const emptyNodeList = {
        length: 0,
        item: () => null,
        forEach: () => {},
        entries: () => [][Symbol.iterator](),
        keys: () => [][Symbol.iterator](),
        values: () => [][Symbol.iterator](),
        [Symbol.iterator]: function* () {}
      } as unknown as NodeList;

      const mutation = {
        type: 'childList',
        addedNodes: mockNodeList,
        removedNodes: emptyNodeList,
        target: document.documentElement,
        attributeName: null,
        attributeNamespace: null,
        nextSibling: null,
        previousSibling: null,
        oldValue: null
      } as MutationRecord;

      mockCallback([mutation]);

      expect(mockScript.setAttribute).toHaveBeenCalledWith('integrity', 'sha384-test-hash');
    });

    it('should handle scripts with no matching hash', () => {
      const enforcer = new SRIEnforcer(window.SRI.config);
      
      const mockScript = {
        tagName: 'SCRIPT',
        getAttribute: jest.fn().mockReturnValue('unknown.js'),
        setAttribute: jest.fn(),
        hasAttribute: jest.fn().mockReturnValue(false),
        // Node interface implementation
        baseURI: '',
        childNodes: {
          length: 0,
          item: () => null,
          forEach: () => {},
          entries: () => [][Symbol.iterator](),
          keys: () => [][Symbol.iterator](),
          values: () => [][Symbol.iterator](),
          [Symbol.iterator]: function* () {}
        } as unknown as NodeList,
        firstChild: null,
        isConnected: true,
        lastChild: null,
        nextSibling: null,
        nodeName: 'SCRIPT',
        nodeType: 1,
        nodeValue: null,
        ownerDocument: mockDocument,
        parentElement: document.documentElement,
        parentNode: document.documentElement,
        previousSibling: null,
        textContent: '',
        appendChild: jest.fn(),
        cloneNode: jest.fn(),
        compareDocumentPosition: jest.fn(),
        contains: jest.fn(),
        getRootNode: jest.fn(),
        hasChildNodes: jest.fn(),
        insertBefore: jest.fn(),
        isDefaultNamespace: jest.fn(),
        isEqualNode: jest.fn(),
        isSameNode: jest.fn(),
        lookupNamespaceURI: jest.fn(),
        lookupPrefix: jest.fn(),
        normalize: jest.fn(),
        removeChild: jest.fn(),
        replaceChild: jest.fn()
      } as unknown as HTMLScriptElement;

      const mockNodeList = {
        length: 1,
        item: (index: number) => index === 0 ? mockScript : null,
        forEach: (callback: (node: Node, index: number) => void) => callback(mockScript, 0),
        entries: () => [[0, mockScript]][Symbol.iterator](),
        keys: () => [0][Symbol.iterator](),
        values: () => [mockScript][Symbol.iterator](),
        [Symbol.iterator]: function* () {
          yield mockScript;
        }
      } as unknown as NodeList;

      const emptyNodeList = {
        length: 0,
        item: () => null,
        forEach: () => {},
        entries: () => [][Symbol.iterator](),
        keys: () => [][Symbol.iterator](),
        values: () => [][Symbol.iterator](),
        [Symbol.iterator]: function* () {}
      } as unknown as NodeList;

      const mutation = {
        type: 'childList',
        addedNodes: mockNodeList,
        removedNodes: emptyNodeList,
        target: document.documentElement,
        attributeName: null,
        attributeNamespace: null,
        nextSibling: null,
        previousSibling: null,
        oldValue: null
      } as MutationRecord;

      mockCallback([mutation]);

      expect(mockScript.setAttribute).not.toHaveBeenCalled();
    });
  });
}); 