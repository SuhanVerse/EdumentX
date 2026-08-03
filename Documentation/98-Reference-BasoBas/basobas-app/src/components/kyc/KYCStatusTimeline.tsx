import React from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { BadgeCheck, Check, Clock, FileText, X } from 'lucide-react-native';

import type { KYCStatus } from '@/src/types/kyc.types';
import { tokens } from '@/src/theme/tokens';

const { color, font, size, radius } = tokens;
const SCREEN_WIDTH = Dimensions.get('window').width;

type StepKey = 'submitted' | 'review' | 'decision';

interface Step {
  key: StepKey;
  label: string;
  Icon: typeof FileText;
}

const STEPS: readonly Step[] = [
  { key: 'submitted', label: 'Submitted', Icon: FileText },
  { key: 'review', label: 'Under Review', Icon: Clock },
  { key: 'decision', label: 'Decision', Icon: BadgeCheck },
];

interface Props {
  status: KYCStatus;
  submittedAt: string;
  reviewedAt?: string | null;
}

const resolveActiveStep = (status: KYCStatus): StepKey => {
  switch (status) {
    case 'UNVERIFIED':
      return 'submitted';
    case 'UNDER_REVIEW':
      return 'review';
    case 'VERIFIED':
    case 'REJECTED':
      return 'decision';
    default:
      return 'submitted';
  }
};

const formatTime = (iso: string | null | undefined): string | null => {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return null;
  }
};

export const KYCStatusTimeline: React.FC<Props> = ({
  status,
  submittedAt,
  reviewedAt,
}) => {
  const active = resolveActiveStep(status);
  const isRejected = status === 'REJECTED';

  const submittedLabel = formatTime(submittedAt);
  const reviewedLabel = formatTime(reviewedAt ?? null);

  const completedSet = new Set<StepKey>();
  if (active === 'review') {
    completedSet.add('submitted');
  } else if (active === 'decision' || isRejected) {
    completedSet.add('submitted');
    completedSet.add('review');
  }

  return (
    <View accessibilityLabel="Verification progress" style={styles.row}>
      {STEPS.map((step, idx) => {
        const isCompleted = completedSet.has(step.key);
        const isActive = step.key === active;
        const isFuture = !isCompleted && !isActive;

        const connectorStyle =
          idx === 0
            ? null
            : isCompleted
              ? styles.connectorCompleted
              : styles.connectorFuture;

        const isDecisionRejected = isRejected && step.key === 'decision';

        const NodeIcon = step.Icon;
        const nodeIconSize = 14;

        return (
          <React.Fragment key={step.key}>
            {connectorStyle && <View style={[styles.connector, connectorStyle]} />}

            <View style={styles.col}>
              <View
                style={[
                  styles.node,
                  isCompleted && styles.nodeCompleted,
                  isActive && styles.nodeActive,
                  isFuture && styles.nodeFuture,
                  isDecisionRejected && styles.nodeRejected,
                ]}>
                {isCompleted && !isDecisionRejected ? (
                  <Check size={nodeIconSize} color="#FFFFFF" strokeWidth={3} />
                ) : isDecisionRejected ? (
                  <X size={nodeIconSize} color="#FFFFFF" strokeWidth={3} />
                ) : (
                  <NodeIcon
                    size={nodeIconSize}
                    color={isActive ? color.brand : color.ink3}
                    strokeWidth={2}
                  />
                )}
              </View>

              <Text
                style={[
                  styles.label,
                  isActive && styles.labelActive,
                  isCompleted && styles.labelCompleted,
                  isFuture && styles.labelFuture,
                ]}
                numberOfLines={1}>
                {step.label}
              </Text>

              <Text style={styles.timestamp}>
                {step.key === 'submitted' && submittedLabel ? submittedLabel : ' '}
                {step.key === 'review' && reviewedLabel ? reviewedLabel : ' '}
              </Text>
            </View>
          </React.Fragment>
        );
      })}
    </View>
  );
};

KYCStatusTimeline.displayName = 'KYCStatusTimeline';

const NODE_SIZE = 32;
const COL_WIDTH = Math.min(96, (SCREEN_WIDTH - 80) / 3);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  col: {
    alignItems: 'center',
    width: COL_WIDTH,
  },
  connector: {
    height: 2.5,
    flex: 1,
    marginTop: NODE_SIZE / 2 - 1.25,
    minWidth: 12,
  },
  connectorCompleted: {
    backgroundColor: color.brand,
  },
  connectorFuture: {
    backgroundColor: 'transparent',
    borderTopWidth: 1.5,
    borderColor: color.divider,
    borderStyle: 'dashed',
    height: 0,
    marginTop: NODE_SIZE / 2 - 0.75,
  },
  node: {
    width: NODE_SIZE,
    height: NODE_SIZE,
    borderRadius: NODE_SIZE / 2,
    backgroundColor: color.bg,
    borderWidth: 2,
    borderColor: color.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeCompleted: {
    backgroundColor: color.brand,
    borderColor: color.brand,
  },
  nodeActive: {
    borderColor: color.brand,
    borderWidth: 2.5,
  },
  nodeFuture: {
    borderColor: color.divider,
    borderWidth: 2,
  },
  nodeRejected: {
    backgroundColor: color.danger,
    borderColor: color.danger,
  },
  label: {
    fontFamily: font.medium,
    fontSize: size.caption,
    color: color.ink2,
    textAlign: 'center',
    marginTop: 10,
  },
  labelActive: {
    color: color.ink,
    fontFamily: font.semibold,
  },
  labelCompleted: {
    color: color.brand,
  },
  labelFuture: {
    color: color.ink3,
  },
  timestamp: {
    fontFamily: font.sans,
    fontSize: size.micro + 1,
    color: color.ink3,
    marginTop: 3,
    textAlign: 'center',
    minHeight: 14,
  },
});
