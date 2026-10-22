import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { filterDiscoveryTutors, getDiscoverySubjects } from "../src/lib/tutor/discovery";

const tutors = [
  { id: "one", fullName: "Mina Shrestha", username: "mina", headline: "Patient science lessons", subjects: ["Mathematics", "Science"], location: { city: "Kathmandu", neighborhood: "Baneshwor" } },
  { id: "two", fullName: "Arjun Rai", username: "arjun", headline: "Practical language lessons", subjects: ["English", " mathematics "], location: { city: "Lalitpur", neighborhood: "Patan" } },
  { id: "three", fullName: "सीता", username: "sita", headline: "नेपाली पढाइ", subjects: ["नेपाली", ""], location: { city: "भक्तपुर", neighborhood: "" } },
];

describe("student discovery", () => {
  it("matches names and usernames case-insensitively", () => {
    assert.deepEqual(filterDiscoveryTutors(tutors, "  MINA ").map(t => t.id), ["one"]);
    assert.deepEqual(filterDiscoveryTutors(tutors, "sita").map(t => t.id), ["three"]);
  });
  it("searches subjects, headlines, cities, and neighborhoods", () => {
    for (const query of ["science", "patient", "kathmandu", "baneshwor"]) {
      assert.deepEqual(filterDiscoveryTutors(tutors, query).map(t => t.id), ["one"]);
    }
  });
  it("requires every query term, even when they span fields", () => {
    assert.deepEqual(filterDiscoveryTutors(tutors, "math   patan").map(t => t.id), ["two"]);
    assert.deepEqual(filterDiscoveryTutors(tutors, "science patan"), []);
  });
  it("combines exact subject selection with text search", () => {
    assert.deepEqual(filterDiscoveryTutors(tutors, "lalitpur", "MATHEMATICS").map(t => t.id), ["two"]);
    assert.deepEqual(filterDiscoveryTutors(tutors, "", "Math"), []);
  });
  it("clearing the query and category restores the complete feed", () => {
    assert.deepEqual(filterDiscoveryTutors(tutors, " \n ", null), tutors);
  });
  it("preserves Nepali text and normalizes compatibility characters", () => {
    assert.deepEqual(filterDiscoveryTutors(tutors, "नेपाली भक्तपुर").map(t => t.id), ["three"]);
    assert.deepEqual(filterDiscoveryTutors(tutors, "ＭＩＮＡ").map(t => t.id), ["one"]);
  });
  it("derives real subject choices without blanks or duplicate casing", () => {
    const subjects = getDiscoverySubjects(tutors);
    assert.equal(subjects.length, 4);
    assert.equal(subjects.filter(s => s.toLowerCase() === "mathematics").length, 1);
    assert.ok(subjects.includes("नेपाली"));
    assert.ok(subjects.includes("English"));
  });
  it("does not change the feed or its subject arrays", () => {
    const before = JSON.stringify(tutors);
    filterDiscoveryTutors(tutors, "mina", "Science");
    getDiscoverySubjects(tutors);
    assert.equal(JSON.stringify(tutors), before);
  });
  it("handles an empty feed and unmatched searches", () => {
    assert.deepEqual(getDiscoverySubjects([]), []);
    assert.deepEqual(filterDiscoveryTutors([], "science"), []);
    assert.deepEqual(filterDiscoveryTutors(tutors, "unlisted tutor"), []);
  });
});
