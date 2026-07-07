import { View } from 'react-native';

type Props = {
  children: React.ReactNode;
  className?: string;
};

export const MenuCard = ({ children, className = '' }: Props) => (
  <View className={`overflow-hidden rounded-card border border-line bg-bg ${className}`}>
    {children}
  </View>
);
