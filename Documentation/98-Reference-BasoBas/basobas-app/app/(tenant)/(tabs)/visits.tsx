import { Text } from 'react-native';

import { ScreenBody } from '@/src/components/layout/ScreenBody';
import { ScreenHeader } from '@/src/components/layout/ScreenHeader';

export default function VisitsTab() {
  return (
    <ScreenBody>
      <ScreenHeader title="Visits" />
      <Text className="mt-20 text-center font-sans text-body text-ink2">
        No visits yet. Schedule a visit to see a property.
      </Text>
    </ScreenBody>
  );
}
