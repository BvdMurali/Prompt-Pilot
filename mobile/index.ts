import { registerRootComponent } from 'expo';
import { AppRegistry } from 'react-native';

import App from './App';
import FloatingBubbleOverlay from './src/components/FloatingBubbleOverlay';

// Register the floating overlay component so native code can mount it
AppRegistry.registerComponent('FloatingBubbleOverlay', () => FloatingBubbleOverlay);

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
registerRootComponent(App);
