import React from 'react';
import {AppRegistry, Image} from 'react-native';
import {PluginManager} from 'sn-plugin-lib';
import App from './App';
import Guard from './src/Guard';
import {name as appName} from './app.json';

const Root = () => (
  <Guard>
    <App />
  </Guard>
);
AppRegistry.registerComponent(appName, () => Root);

PluginManager.init();

PluginManager.registerButton(1, ['NOTE', 'DOC'], {
  id: 1,
  name: 'Book',
  icon: Image.resolveAssetSource(require('./assets/icon.png')).uri,
  showType: 1,
});
