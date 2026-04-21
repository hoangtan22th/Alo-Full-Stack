// @ts-nocheck
// ES5 Polyfill for DOMException to avoid Babel's wrapNativeSuper crash in Metro
if (typeof global.DOMException === 'undefined') {
  function DOMException(message, name) {
    this.message = message;
    this.name = name || 'DOMException';
    var err = new Error(message);
    this.stack = err.stack;
  }
  DOMException.prototype = Object.create(Error.prototype);
  DOMException.prototype.constructor = DOMException;
  global.DOMException = DOMException;
}

try {
  const { registerGlobals } = require('@livekit/react-native');
  registerGlobals();
} catch (e) {
  // safe ignore
}
