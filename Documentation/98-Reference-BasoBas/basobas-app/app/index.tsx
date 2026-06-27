import { Redirect } from 'expo-router';
import { getInitialHref } from '../src/config/devMode';

export default function Index() {
  return <Redirect href={getInitialHref() as any} />;
}
