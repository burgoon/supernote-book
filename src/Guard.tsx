import React from 'react';
import {ScrollView, StyleSheet, Text} from 'react-native';

type State = {error: string | null};

export default class Guard extends React.Component<{children: React.ReactNode}, State> {
  state: State = {error: null};

  static getDerivedStateFromError(e: any): State {
    return {error: String(e?.stack || e?.message || e)};
  }

  componentDidMount() {
    const prev = (global as any).ErrorUtils?.getGlobalHandler?.();
    (global as any).ErrorUtils?.setGlobalHandler?.((e: any, fatal?: boolean) => {
      this.setState({error: `${fatal ? 'fatal: ' : ''}${e?.stack || e?.message || e}`});
      prev?.(e, false);
    });
  }

  render() {
    if (this.state.error) {
      return (
        <ScrollView style={styles.box} contentContainerStyle={styles.pad}>
          <Text style={styles.title}>Supernote Book hit an error</Text>
          <Text style={styles.mono}>{this.state.error}</Text>
        </ScrollView>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  box: {flex: 1, backgroundColor: '#fff'},
  pad: {padding: 16},
  title: {fontSize: 20, fontWeight: '700', color: '#000', marginBottom: 12},
  mono: {fontSize: 13, color: '#000', fontFamily: 'monospace'},
});
