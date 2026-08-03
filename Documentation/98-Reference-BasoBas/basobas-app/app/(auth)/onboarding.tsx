import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { View, Text, useWindowDimensions, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated'

import { MapIllustration } from '@/src/components/onboarding/MapIllustration'
import { VerifiedIllustration } from '@/src/components/onboarding/VerifiedIllustration'
import { VisitIllustration } from '@/src/components/onboarding/VisitIllustration'
import { PaginationDots } from '@/src/components/onboarding/PaginationDots'
import { NextButton } from '@/src/components/onboarding/NextButton'
import { SkipButton } from '@/src/components/onboarding/SkipButton'
import { tokens } from '@/src/theme/tokens'

interface FeatureSlide {
  overline: string
  headline: string
  body: string
  Illustration: React.FC
}

const SLIDES: FeatureSlide[] = [
  {
    overline: 'Only Verified',
    headline: 'Real homes.\nVerified humans.',
    body: 'Every listing on BasoBas is checked by system. No catfish. No scams. Just the real deal.',
    Illustration: VerifiedIllustration,
  },
  {
    overline: 'Visits in seconds',
    headline: 'Book a Rental\nin one tap.',
    body: 'Pick a time that works. Landlords confirm fast. Skip the back and forth on chat.',
    Illustration: VisitIllustration,
  },
  {
    overline: 'Search by area',
    headline: 'Explore by\nneighborhood.',
    body: 'See every verified rental on a live map. Filter by price, beds, and what matters most to you.',
    Illustration: MapIllustration,
  },
]

export default function AuthOnboardingScreen() {
  const router = useRouter()
  const { height, width: screenWidth } = useWindowDimensions()
  const illustrationHeight = Math.round(height * 0.38)

  const [activeIndex, setActiveIndex] = useState(0)
  const isLast = activeIndex === SLIDES.length - 1

  // ── Shared values ────────────────────────────────────────────────────────────

  const enterOpacity = useSharedValue(0)
  const enterY = useSharedValue(20)
  const contentTranslateX = useSharedValue(0)
  const activeIndexSv = useSharedValue(0)

  useEffect(() => {
    activeIndexSv.value = activeIndex
  }, [activeIndex])

  // ── Mount effect ─────────────────────────────────────────────────────────────

  useEffect(() => {
    enterOpacity.value = withTiming(1, { duration: 500 })
    enterY.value = withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const snapTo = useCallback(
    (targetIdx: number) => {
      'worklet'
      activeIndexSv.value = targetIdx
      runOnJS(setActiveIndex)(targetIdx)
      const targetOffset = -(targetIdx * screenWidth)
      contentTranslateX.value = withTiming(targetOffset, {
        duration: 250,
        easing: Easing.out(Easing.cubic),
      })
    },
    [screenWidth],
  )

  // ── Gesture swipe ────────────────────────────────────────────────────────────

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-10, 10])
        .failOffsetY([-12, 12])
        .onUpdate((e) => {
          'worklet'
          const baseOffset = -(activeIndexSv.value * screenWidth)
          contentTranslateX.value = baseOffset + e.translationX * 0.62
        })
        .onEnd((e) => {
          'worklet'
          const cur = activeIndexSv.value
          const threshold = screenWidth * 0.2
          const velThreshold = 350

          const leftSwipe = e.translationX < -threshold || e.velocityX < -velThreshold
          const rightSwipe = e.translationX > threshold || e.velocityX > velThreshold

          if (leftSwipe && cur < SLIDES.length - 1) {
            snapTo(cur + 1)
          } else if (rightSwipe && cur > 0) {
            snapTo(cur - 1)
          } else {
            snapTo(cur)
          }
        }),
    [screenWidth, snapTo],
  )

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleNext = useCallback(() => {
    if (isLast) {
      router.replace('/(auth)/phone')
    } else {
      snapTo(activeIndex + 1)
    }
  }, [isLast, activeIndex, router, snapTo])

  const handleSkip = useCallback(() => {
    router.replace('/(auth)/phone')
  }, [router])

  // ── Animated styles ──────────────────────────────────────────────────────────

  const enterStyle = useAnimatedStyle(() => ({
    opacity: enterOpacity.value,
    transform: [{ translateY: enterY.value }],
  }))

  const carouselStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: contentTranslateX.value }],
  }))

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView edges={['top', 'bottom']} style={s.safe}>
      <Animated.View style={[{ flex: 1 }, enterStyle]}>
        {/* ── Header ─────────────────────────────────────────────────----- */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <Text style={s.logo}>BasoBas</Text>
            <View style={s.betaBadge}>
              <Text style={s.betaText}>BETA</Text>
            </View>
          </View>
          <SkipButton onPress={handleSkip} />
        </View>

        {/* ── CAROUSEL ──────────────────────────────────────────────────── */}
        <GestureDetector gesture={panGesture}>
          <View style={s.carouselContainer}>
            <Animated.View
              style={[
                carouselStyle,
                { width: screenWidth * SLIDES.length, flex: 1, flexDirection: 'row' },
              ]}
            >
              {SLIDES.map((slide, idx) => {
                const Illustration = slide.Illustration
                return (
                  <View key={idx} style={{ flex: 1 }}>
                    <View style={[s.illustration, { height: illustrationHeight }]}>
                      <Illustration />
                    </View>
                    <View style={s.textBlock}>
                      <Text style={s.overline}>{slide.overline}</Text>
                      <Text style={s.headline}>{slide.headline}</Text>
                      <Text style={s.body}>{slide.body}</Text>
                    </View>
                  </View>
                )
              })}
            </Animated.View>
          </View>
        </GestureDetector>

        {/* ── Bottom ────────────────────────────────────────────────────── */}
        <View style={s.bottom}>
          <View style={s.dots}>
            <PaginationDots total={3} current={activeIndex} />
          </View>
          <NextButton onPress={handleNext} label={isLast ? 'Get started' : 'Next'} />
        </View>
      </Animated.View>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe:              { flex: 1, backgroundColor: tokens.color.bg },
  header:            { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24 },
  headerLeft:        { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logo:              { fontFamily: tokens.font.display, fontSize: 22, color: tokens.color.ink },
  betaBadge:         { borderRadius: 4, backgroundColor: tokens.color.brand, paddingHorizontal: 6, paddingVertical: 2 },
  betaText:          { fontFamily: tokens.font.bold, fontSize: 9, letterSpacing: 1, color: tokens.color.bg },
  carouselContainer: { flex: 1, overflow: 'hidden' },
  illustration:      { marginHorizontal: 20, overflow: 'hidden', borderRadius: tokens.radius.hero },
  textBlock:         { flex: 1, justifyContent: 'center', paddingHorizontal: 24, paddingBottom: 8, paddingTop: 20 },
  overline:          { fontFamily: tokens.font.semibold, fontSize: tokens.size.label, color: tokens.color.brand, letterSpacing: 1.43, textTransform: 'uppercase' },
  headline:          { fontFamily: tokens.font.display, fontSize: 30, color: tokens.color.ink, lineHeight: 37, marginTop: 6 },
  body:              { fontFamily: tokens.font.sans, fontSize: tokens.size.body, color: tokens.color.ink2, lineHeight: 22, marginTop: 12 },
  bottom:            { paddingHorizontal: 24, paddingBottom: 16, paddingTop: 4 },
  dots:              { marginBottom: 20, alignItems: 'center' },
})
