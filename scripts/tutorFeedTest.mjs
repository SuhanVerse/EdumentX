import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import vm from "node:vm";
import ts from "typescript";

// Exercise the actual repository without loading native Firebase or connecting
// to a backend. Only the external subscription boundaries are substituted.
const sourceUrl = new URL("../src/services/tutors/FirebaseTutorRepository.ts", import.meta.url);
const { outputText } = ts.transpileModule(readFileSync(sourceUrl, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  fileName: sourceUrl.pathname,
});

function createFeed() {
  let tutorData;
  let tutorError;
  let reviewData;
  let tutorUnsubscribes = 0;
  let reviewUnsubscribes = 0;
  const exports = {};
  const imports = {
    "@react-native-firebase/app": { getApp: () => ({}) },
    "@react-native-firebase/firestore": {
      getFirestore: () => ({}),
      collectionGroup: (_db, name) => ({ name }),
      onSnapshot: (query, onData) => {
        assert.equal(query.name, "reviews");
        reviewData = onData;
        return () => { reviewUnsubscribes += 1; };
      },
    },
    "@/lib/tutor/firestoreTutorService": {
      subscribeTutors: (onData, onError) => {
        tutorData = onData;
        tutorError = onError;
        return () => { tutorUnsubscribes += 1; };
      },
      fetchTutorProfile: async () => null,
    },
  };
  vm.runInNewContext(outputText, {
    exports,
    require: (name) => {
      assert.ok(Object.hasOwn(imports, name), `Unexpected runtime import: ${name}`);
      return imports[name];
    },
    console: { warn: () => {} },
  }, { filename: sourceUrl.pathname });
  const emissions = [];
  const errors = [];
  const unsubscribe = exports.FirebaseTutorRepository.subscribeTutors(
    (tutors) => emissions.push(tutors),
    (error) => errors.push(error),
  );
  return {
    emissions,
    errors,
    tutors: (rows) => tutorData(rows),
    error: (error) => tutorError(error),
    reviews: (rows) => reviewData({ docs: rows.map(row => ({ data: () => row })) }),
    unsubscribe,
    unsubscribeCounts: () => [tutorUnsubscribes, reviewUnsubscribes],
  };
}

const tutor = {
  uid: "tutor-one", fullName: "Mina Shrestha", username: "mina",
  headline: "Science lessons", subjects: ["Science"], monthlyRateNpr: 2500,
  location: { city: "Kathmandu", neighborhood: "Baneshwor" },
  photoUrl: null, verificationStatus: "approved", isVerifiedProfessional: true,
  rating: 3, reviewCount: 1, yearsExperience: 4, gender: "female",
};

describe("combined tutor discovery feed", () => {
  it("waits for the tutor snapshot when reviews arrive first", () => {
    const feed = createFeed();
    feed.reviews([{ tutorUid: tutor.uid, status: "active", score: 5 }]);
    assert.equal(feed.emissions.length, 0);
    feed.tutors([tutor]);
    assert.equal(feed.emissions.length, 1);
    assert.equal(feed.emissions[0][0].rating, 5);
    feed.unsubscribe();
  });

  it("emits a genuine empty tutor snapshot", () => {
    const feed = createFeed();
    feed.tutors([]);
    assert.equal(feed.emissions.length, 1);
    assert.equal(feed.emissions[0].length, 0);
    feed.reviews([]);
    assert.equal(feed.emissions.length, 2);
    assert.equal(feed.emissions[1].length, 0);
    feed.unsubscribe();
  });

  it("preserves discovery values then overlays live active reviews", () => {
    const feed = createFeed();
    feed.tutors([tutor]);
    assert.equal(feed.emissions[0][0].rating, 3);
    feed.reviews([
      { tutorUid: tutor.uid, status: "active", score: 4 },
      { tutorUid: tutor.uid, status: "active", score: 5 },
      { tutorUid: tutor.uid, status: "removed", score: 1 },
    ]);
    assert.equal(feed.emissions.length, 2);
    assert.equal(feed.emissions[1][0].rating, 4.5);
    assert.equal(feed.emissions[1][0].reviewCount, 2);
    assert.equal(feed.emissions[1][0].fullName, tutor.fullName);
    feed.unsubscribe();
  });

  it("reports terminal tutor errors without a review-driven false recovery", () => {
    const feed = createFeed();
    feed.tutors([tutor]);
    const error = new Error("permission-denied");
    feed.error(error);
    assert.equal(feed.errors.length, 1);
    assert.equal(feed.errors[0], error);
    feed.reviews([{ tutorUid: tutor.uid, status: "active", score: 5 }]);
    feed.tutors([tutor]); // Simulate a callback already queued at failure.
    assert.equal(feed.emissions.length, 1);
    feed.unsubscribe();
  });

  it("retains an initial tutor error when no tutor snapshot succeeded", () => {
    const feed = createFeed();
    feed.error(new Error("unavailable"));
    feed.reviews([]);
    assert.equal(feed.errors.length, 1);
    assert.equal(feed.emissions.length, 0);
    feed.unsubscribe();
  });

  it("does not deliver queued callbacks after unsubscribe", () => {
    const feed = createFeed();
    feed.tutors([tutor]);
    feed.unsubscribe();
    assert.deepEqual(feed.unsubscribeCounts(), [1, 1]);
    feed.reviews([{ tutorUid: tutor.uid, status: "active", score: 5 }]);
    feed.tutors([]);
    feed.error(new Error("late error"));
    assert.equal(feed.emissions.length, 1);
    assert.equal(feed.errors.length, 0);
  });
});
