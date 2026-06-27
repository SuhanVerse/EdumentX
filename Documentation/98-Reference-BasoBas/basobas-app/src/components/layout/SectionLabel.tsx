import { Text } from 'react-native';

type Props = {
  label: string;
  className?: string;
};

export const SectionLabel = ({ label, className = '' }: Props) => (
  <Text className={`font-bold text-caption tracking-[1.2px] text-ink3 uppercase ${className}`}>
    {label}
  </Text>
);
