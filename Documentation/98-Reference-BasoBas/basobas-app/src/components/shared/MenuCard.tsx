import { View } from 'react-native';

type Props = {
  children: React.ReactNode;
  className?: string;
};

export const MenuCard = ({ children, className = '' }: Props) => (
  <View className={`rounded-card border border-line bg-bg overflow-hidden ${className}`}>
    {children}
  </View>
);
