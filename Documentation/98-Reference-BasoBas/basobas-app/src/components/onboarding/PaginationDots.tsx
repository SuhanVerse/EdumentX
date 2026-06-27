import React from 'react';
import { View } from 'react-native';

interface PaginationDotsProps {
  total: number;
  current: number; // 0‑indexed
}

const PaginationDots: React.FC<PaginationDotsProps> = React.memo(({ total, current }) => {
  return (
    <View className="flex-row items-center gap-[6px]">
      {Array.from({ length: total }).map((_, index) => {
        const isActive = index === current;
        return (
          <View
            key={index}
            className="h-[7px] rounded-full bg-ink"
            style={{
              width: isActive ? 20 : 7,
              opacity: isActive ? 1 : 0.25,
            }}
          />
        );
      })}
    </View>
  );
});

PaginationDots.displayName = 'PaginationDots';

export { PaginationDots };
