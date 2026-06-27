import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
  Image,
} from "react-native";
import { ChevronLeft, Plus, Camera, Minus } from "lucide-react-native";
import { TutorBottomBar } from "../../components/TutorBottomBar";

export function EditTutorProfile() {
  const [form, setForm] = useState({
    fullName: "Ram Sharma",
    monthlyRate: "3500",
    subjects: ["Mathematics", "Physics"],
    experience: 5,
    qualifications: "M.Sc. Mathematics, Tribhuvan University",
    aboutMe:
      "Experienced mathematics and physics tutor with 5 years of teaching in Kathmandu Valley. Specializes in board exam preparation.",
    serviceRadius: 5,
    availability: ["Mon", "Tue", "Wed", "Fri"],
  });

  const [saving, setSaving] = useState(false);

  const toggleSubject = (subject: string) => {
    setForm((prev) => ({
      ...prev,
      subjects: prev.subjects.includes(subject)
        ? prev.subjects.filter((s) => s !== subject)
        : [...prev.subjects, subject],
    }));
  };

  const toggleDay = (day: string) => {
    setForm((prev) => ({
      ...prev,
      availability: prev.availability.includes(day)
        ? prev.availability.filter((d) => d !== day)
        : [...prev.availability, day],
    }));
  };

  const handleSave = async () => {
    setSaving(true);

    // TODO(firebase): Save to tutorProfiles collection
    console.log("Saving profile:", form);

    setTimeout(() => {
      setSaving(false);
      Alert.alert(
        "Profile Updated",
        "Your changes have been saved successfully.",
        [{ text: "OK" }],
      );
    }, 800);
  };

  const availableSubjects = [
    "Mathematics",
    "Physics",
    "Chemistry",
    "Biology",
    "English",
    "Science",
    "Social Studies",
    "Computer Science",
    "Economics",
    "Accountancy",
  ];

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <View className="flex-1 bg-night">
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 pt-12 pb-4 bg-surface border-b border-border">
        <Pressable
          onPress={() => {
            /* TODO: navigation.goBack() */
          }}
          className="flex-row items-center gap-1"
        >
          <ChevronLeft size={24} color="#94A3B8" />
          <Text className="text-text-primary font-medium">Edit profile</Text>
        </Pressable>

        <Pressable
          onPress={handleSave}
          disabled={saving}
          className="bg-ai px-6 py-2 rounded-full active:opacity-90"
        >
          <Text className="text-white font-semibold">
            {saving ? "Saving..." : "Save"}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        className="flex-1 px-6 pt-6 pb-20"
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Picture */}
        <View className="items-center mb-8">
          <View className="relative">
            <View className="w-28 h-28 rounded-full overflow-hidden border-4 border-surface">
              <Image
                source={{ uri: "https://i.imgur.com/8Km9tLL.jpeg" }}
                className="w-full h-full"
              />
            </View>
            <Pressable className="absolute bottom-0 right-0 bg-ai w-8 h-8 rounded-full items-center justify-center border-2 border-surface">
              <Camera size={16} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>

        {/* Full Name */}
        <View className="mb-6">
          <Text className="text-text-secondary text-sm mb-2 font-medium">
            FULL NAME
          </Text>
          <TextInput
            value={form.fullName}
            onChangeText={(text) =>
              setForm((prev) => ({ ...prev, fullName: text }))
            }
            className="bg-surface border border-border rounded-card px-4 py-4 text-text-primary"
          />
        </View>

        {/* Monthly Rate */}
        <View className="mb-6">
          <Text className="text-text-secondary text-sm mb-2 font-medium">
            MONTHLY RATE (RS)
          </Text>
          <TextInput
            value={form.monthlyRate}
            onChangeText={(text) =>
              setForm((prev) => ({ ...prev, monthlyRate: text }))
            }
            keyboardType="numeric"
            className="bg-surface border border-border rounded-card px-4 py-4 text-text-primary"
          />
        </View>

        {/* Subjects */}
        <View className="mb-8">
          <Text className="text-text-secondary text-sm mb-3 font-medium">
            SUBJECTS I TEACH
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {availableSubjects.map((subject) => (
              <Pressable
                key={subject}
                onPress={() => toggleSubject(subject)}
                className={`px-5 py-2 rounded-full border ${
                  form.subjects.includes(subject)
                    ? "bg-ai border-ai"
                    : "bg-surface border-border"
                }`}
              >
                <Text
                  className={
                    form.subjects.includes(subject)
                      ? "text-white"
                      : "text-text-secondary"
                  }
                >
                  {subject}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Years of Experience */}
        <View className="mb-8">
          <Text className="text-text-secondary text-sm mb-3 font-medium">
            YEARS OF EXPERIENCE
          </Text>
          <View className="flex-row items-center gap-4 bg-surface border border-border rounded-card px-6 py-4">
            <Pressable
              onPress={() =>
                setForm((prev) => ({
                  ...prev,
                  experience: Math.max(0, prev.experience - 1),
                }))
              }
              className="w-10 h-10 rounded-full bg-surface-secondary items-center justify-center"
            >
              <Minus size={20} color="#94A3B8" />
            </Pressable>

            <Text className="text-3xl font-semibold text-text-primary flex-1 text-center">
              {form.experience}
            </Text>

            <Text className="text-text-secondary">years</Text>

            <Pressable
              onPress={() =>
                setForm((prev) => ({
                  ...prev,
                  experience: prev.experience + 1,
                }))
              }
              className="w-10 h-10 rounded-full bg-surface-secondary items-center justify-center"
            >
              <Plus size={20} color="#94A3B8" />
            </Pressable>
          </View>
        </View>

        {/* Qualifications */}
        <View className="mb-8">
          <Text className="text-text-secondary text-sm mb-2 font-medium">
            QUALIFICATIONS
          </Text>
          <TextInput
            value={form.qualifications}
            onChangeText={(text) =>
              setForm((prev) => ({ ...prev, qualifications: text }))
            }
            multiline
            className="bg-surface border border-border rounded-card px-4 py-4 text-text-primary min-h-[52px]"
          />
        </View>

        {/* About Me */}
        <View className="mb-8">
          <Text className="text-text-secondary text-sm mb-2 font-medium">
            ABOUT ME
          </Text>
          <TextInput
            value={form.aboutMe}
            onChangeText={(text) =>
              setForm((prev) => ({ ...prev, aboutMe: text }))
            }
            multiline
            numberOfLines={4}
            className="bg-surface border border-border rounded-card px-4 py-4 text-text-primary min-h-[100px]"
          />
        </View>

        {/* Service Radius */}
        <View className="mb-8">
          <Text className="text-text-secondary text-sm mb-3 font-medium">
            SERVICE RADIUS: {form.serviceRadius} KM
          </Text>
          <View className="bg-surface border border-border rounded-card p-4">
            {/* Mock Map */}
            <View className="h-40 bg-[#1E2937] rounded-xl mb-4 overflow-hidden relative items-center justify-center">
              <Text className="text-white/60 text-sm">Map Preview</Text>
              <View className="absolute w-20 h-20 border-2 border-ai rounded-full" />
              <View className="absolute w-3 h-3 bg-ai rounded-full" />
            </View>

            <View className="px-2">
              <View className="h-1 bg-border rounded-full relative">
                <View
                  className="absolute h-1 bg-ai rounded-full"
                  style={{ width: `${(form.serviceRadius / 10) * 100}%` }}
                />
              </View>
              <View className="flex-row justify-between text-xs text-text-secondary mt-1">
                <Text>1 km</Text>
                <Text>10 km</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Weekly Availability */}
        <View className="mb-8">
          <Text className="text-text-secondary text-sm mb-3 font-medium">
            WEEKLY AVAILABILITY
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {days.map((day) => (
              <Pressable
                key={day}
                onPress={() => toggleDay(day)}
                className={`px-6 py-3 rounded-full border ${
                  form.availability.includes(day)
                    ? "bg-ai border-ai"
                    : "bg-surface border-border"
                }`}
              >
                <Text
                  className={
                    form.availability.includes(day)
                      ? "text-white"
                      : "text-text-secondary"
                  }
                >
                  {day}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>

      <TutorBottomBar />
    </View>
  );
}
