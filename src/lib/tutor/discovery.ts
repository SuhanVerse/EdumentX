/** Local discovery uses the existing feed; typing never makes a network request. */
type DiscoverableTutor = {
  fullName: string;
  username?: string;
  headline?: string;
  subjects: readonly string[];
  location: { city: string; neighborhood?: string };
};

function normalize(value: string): string {
  return value.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
}

export function getDiscoverySubjects(tutors: readonly DiscoverableTutor[]): string[] {
  const subjects = new Map<string, string>();
  for (const tutor of tutors) {
    for (const subject of tutor.subjects) {
      const label = subject.replace(/\s+/g, " ").trim();
      const key = normalize(label);
      if (key && !subjects.has(key)) subjects.set(key, label);
    }
  }
  return [...subjects.values()].sort((a, b) => a.localeCompare(b));
}

export function filterDiscoveryTutors<T extends DiscoverableTutor>(
  tutors: readonly T[],
  query: string,
  subject: string | null = null,
): T[] {
  const terms = normalize(query).split(" ").filter(Boolean);
  const selectedSubject = subject ? normalize(subject) : null;
  return tutors.filter((tutor) => {
    if (selectedSubject && !tutor.subjects.some(s => normalize(s) === selectedSubject)) return false;
    const text = normalize([
      tutor.fullName, tutor.username, tutor.headline, ...tutor.subjects,
      tutor.location.city, tutor.location.neighborhood,
    ].filter(Boolean).join(" "));
    return terms.every(term => text.includes(term));
  });
}
