// This is the absolute root of the application
// Polyfill global Web APIs for LiveKit WebRTC BEFORE Expo Router executes
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
  console.log("Could not register livekit globals here", e);
}

// Boot up Expo Router
import 'expo-router/entry';
