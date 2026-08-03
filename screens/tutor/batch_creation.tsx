import React, { useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { Plus } from "lucide-react-native";
import { TutorBottomBar } from "@/components/TutorBottomBar";
import {
  ScreenLayout,
  ScreenHeader,
  ScreenScroll,
} from "@/components/shared/ScreenLayout";

interface Batch {
  id: string;
  name: string;
  subject: string;
  fee: number;
  seatsFilled: number;
  totalSeats: number;
  days: string[];
  students: Array<{
    id: string;
    name: string;
    avatar?: string;
  }>;
  isActive: boolean;
}

const MOCK_BATCHES: Batch[] = [
  {
    id: "1",
    name: "Grade 10 Maths Batch A",
    subject: "Mathematics",
    fee: 2200,
    seatsFilled: 4,
    totalSeats: 6,
    days: ["Mon", "Wed", "Fri"],
    students: [
      { id: "s1", name: "Aarav Tamang" },
      { id: "s2", name: "Priya Maharjan" },
      { id: "s3", name: "Sanjay Pandey" },
    ],
    isActive: true,
  },
];

export function BatchesScreen() {
  const [batches] = useState(MOCK_BATCHES);
  const [showPickStudents, setShowPickStudents] = useState(false);

  const handleCreateNewBatch = () => setShowPickStudents(true);

  return (
    <ScreenLayout variant="night">
      {/* Header — standard light header slot. The old `pt-12` manual
          status-bar compensation is gone: `ScreenLayout`'s safe area
          now provides the top inset like every other screen. */}
      <ScreenHeader variant="light">
        <Text className="text-2xl font-bold text-text-primary">
          Group Batches
        </Text>
        <Text className="text-text-secondary mt-1">
          Combine students into shared batches
        </Text>
      </ScreenHeader>

      <ScreenScroll className="flex-1">
        <Pressable
          onPress={handleCreateNewBatch}
          className="bg-ai rounded-card py-4 px-6 flex-row items-center justify-center gap-2 active:opacity-90 mb-8"
        >
          <Plus size={20} color="#FFFFFF" strokeWidth={3} />
          <Text className="text-white font-semibold text-base">
            Create New Batch
          </Text>
        </Pressable>

        {/* Active Batches */}
        <View className="mb-6">
          <Text className="text-text-primary font-semibold text-lg mb-4">
            Active Batches
          </Text>
          {batches.map((batch) => (
            <View
              key={batch.id}
              className="bg-surface border border-border rounded-card p-5 mb-4"
            >
              {/* Header row */}
              <View className="flex-row justify-between items-start mb-3">
                <View className="flex-1 pr-3">
                  <Text className="text-text-primary font-semibold text-lg">
                    {batch.name}
                  </Text>
                  <Text className="text-text-secondary">
                    {batch.subject} • Rs {batch.fee.toLocaleString()}/student/mo
                  </Text>
                </View>
                <View className="bg-success/10 px-3 py-1 rounded-full">
                  <Text className="text-success text-xs font-medium">
                    Active
                  </Text>
                </View>
              </View>

              {/* Seats progress */}
              <View className="mb-4">
                <View className="flex-row justify-between mb-1.5">
                  <Text className="text-text-secondary text-xs">
                    Seats filled
                  </Text>
                  <Text className="text-text-primary text-xs">
                    {batch.seatsFilled}/{batch.totalSeats}
                  </Text>
                </View>
                <View className="h-1.5 bg-border rounded-full overflow-hidden">
                  <View
                    className="h-1.5 bg-ai rounded-full"
                    style={{
                      width: `${(batch.seatsFilled / batch.totalSeats) * 100}%`,
                    }}
                  />
                </View>
              </View>

              {/* Days */}
              <View className="flex-row gap-2 mb-4">
                {batch.days.map((day) => (
                  <View
                    key={day}
                    className="bg-background px-3 py-1 rounded-full"
                  >
                    <Text className="text-text-secondary text-xs">{day}</Text>
                  </View>
                ))}
              </View>

              {/* Students */}
              <View className="flex-row items-center">
                <View className="flex-row -space-x-2">
                  {batch.students.slice(0, 3).map((student) => (
                    <View
                      key={student.id}
                      className="w-8 h-8 rounded-full border-2 border-surface overflow-hidden"
                    >
                      {/* TODO: Avatar */}
                      <View className="w-full h-full bg-ai/20" />
                    </View>
                  ))}
                </View>
                {batch.students.length > 3 && (
                  <Text className="text-text-secondary text-sm ml-3">
                    +{batch.students.length - 3}
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>
      </ScreenScroll>

      <TutorBottomBar />

      {showPickStudents && (
        <View className="absolute inset-0 bg-black/70 justify-end">
          <View className="bg-surface rounded-t-3xl h-[85%] p-6">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-xl font-semibold text-text-primary">
                Pick students
              </Text>
              <Pressable onPress={() => setShowPickStudents(false)}>
                <Text className="text-ai">Cancel</Text>
              </Pressable>
            </View>

            <Text className="text-text-secondary mb-4">Step 1 of 3</Text>
            <Text className="text-text-secondary mb-6">
              Select 2-6 enrolled students.
            </Text>

            {/* Student List - TODO(firebase) */}
            <ScrollView className="flex-1">
              {/* Add your student selection cards here */}
            </ScrollView>

            <Pressable className="bg-ai py-4 rounded-card mt-6">
              <Text className="text-white text-center font-semibold">
                Continue
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    </ScreenLayout>
  );
}
