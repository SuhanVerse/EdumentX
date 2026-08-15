# Fix Google Maps API key error (fork #1)

**Session ID:** ses_01a3df35cffeLZIDZTYP23DBAY
**Created:** 8/9/2026, 2:47:07 PM
**Updated:** 8/9/2026, 6:12:05 PM

---

## Assistant (Build · DeepSeek V4 Flash Free · 9.8s)

_Thinking:_

Excellent. Key expo-maps findings:

**iOS (Apple Maps)**: `properties.pointsOfInterest = { including: [] }` or `{ excluding: [...] }` — "To hide all POIs, set this to an empty array." → we CAN hide all POIs on iOS.

**Android (Google Maps)**: `GoogleMapsProperties` — NO `isPointsOfInterestEnabled`, NO local style JSON. `mapStyleOptions` requires a cloud `mapId` (paid). So there's NO supported way to hide POIs on Android via expo-maps 0.12.

Hmm wait — let me double check whether `mapStyleOptions` with raw JSON might work without a mapId... The type says "With style options you can customize the presentation..." but GoogleMapsMapOptions.mapId is "a unique identifier that represents Google Map styling and configuration settings that are stored in Google Cloud". Actually the JSON style (mapstyle.withgoogle.com) is applied via a mapId in Google Maps Android SDK v17+... In newer Google Maps SDK, raw style JSON is NOT supported anymore (only via cloud map IDs). So `mapStyleOptions` likely requires a mapId. Let me check the actual native implementation to be sure. Also, maybe the Google maps view doesn't even read mapStyleOptions without a mapId. This is a real constraint.

So the honest audit for 2.1: 
- We CANNOT strip POIs on Android Google maps with expo-maps (no API; raw style JSON removed from Google Maps SDK). 
- The mission's assumption of react-native-maps is wrong — the project deliberately uses expo-maps (per CLAUDE.md architecture doc §5.2 says OpenStreetMap via react-native-maps? wait, CLAUDE.md says "Map tiles come from OpenStreetMap via react-native-maps UrlTile" — but the actual implementation uses expo-maps Google/Apple!). Hmm. The current real implementation is expo-maps (Google Maps on Android with default tiles — NOT OSM UrlTile). So there's a discrepancy between CLAUDE.md's stated plan and reality, but reality = expo-maps.

Given the mission constraint: "The intended fix here is a local style JSON that zeroes out POIs... but check what the map library actually supports before writing it." — YES, this is exactly the check they want. For Android, we CAN still reduce POI visual clutter a bit: disable `isBuildingEnabled`, `isIndoorEnabled`, `isTrafficEnabled`. But bus-stop icons etc. remain.

Wait — actually let me check the GoogleMapsView.d.ts to see if there are more props like `poiCategories` or something in newer expo-maps. Let me read GoogleMapsView.d.ts fully.

**Tool: read**

**Input:**
```json
{
  "filePath": "/media/xlegion/Win/PROJECTS/EdumentX/node_modules/expo-maps/build/google/GoogleMapsView.d.ts"
}
```

**Output:**
```
<path>/media/xlegion/Win/PROJECTS/EdumentX/node_modules/expo-maps/build/google/GoogleMapsView.d.ts</path>
<type>file</type>
<content>
1: import * as React from 'react';
2: import type { GoogleMapsViewProps, GoogleMapsViewType } from './GoogleMaps.types';
3: /**
4:  * @platform android
5:  */
6: export declare const GoogleMapsView: React.ForwardRefExoticComponent<Omit<GoogleMapsViewProps, "ref"> & React.RefAttributes<GoogleMapsViewType>>;
7: //# sourceMappingURL=GoogleMapsView.d.ts.map

(End of file - total 7 lines)
</content>
```

---

## Assistant (Build · DeepSeek V4 Flash Free · 3.4s)

**Tool: bash**

**Input:**
```json
{
  "command": "grep -n \"GoogleMapsViewProps\" node_modules/expo-maps/build/google/GoogleMaps.types.d.ts | head -3; grep -n -A60 \"export declare type GoogleMapsViewProps\" node_modules/expo-maps/build/google/GoogleMaps.types.d.ts | head -80"
}
```

**Output:**
```
322:export type GoogleMapsViewProps = {

```

---

## Assistant (Build · DeepSeek V4 Flash Free · 2.6s)

**Tool: bash**

**Input:**
```json
{
  "command": "sed -n '322,420p' node_modules/expo-maps/build/google/GoogleMaps.types.d.ts"
}
```

**Output:**
```
export type GoogleMapsViewProps = {
    ref?: Ref<GoogleMapsViewType>;
    style?: StyleProp<ViewStyle>;
    /**
     * The initial camera position of the map.
     */
    cameraPosition?: CameraPosition;
    /**
     * The array of markers to display on the map.
     */
    markers?: GoogleMapsMarker[];
    /**
     * The array of polylines to display on the map.
     */
    polylines?: GoogleMapsPolyline[];
    /**
     * The array of polygons to display on the map.
     */
    polygons?: GoogleMapsPolygon[];
    /**
     * The array of circles to display on the map.
     */
    circles?: GoogleMapsCircle[];
    /**
     * The `MapUiSettings` to be used for UI-specific settings on the map.
     */
    uiSettings?: GoogleMapsUISettings;
    /**
     * The properties for the map.
     */
    properties?: GoogleMapsProperties;
    /**
     * Defines configuration GoogleMapOptions for a GoogleMap
     */
    mapOptions?: GoogleMapsMapOptions;
    /**
     * Defines the color scheme for the map.
     */
    colorScheme?: GoogleMapsColorScheme;
    /**
     * User location, overrides default behavior.
     */
    userLocation?: GoogleMapsUserLocation;
    /**
     * The padding values used to signal that portions of the map around the edges may be obscured.
     * The map will move the Google logo, etc. to avoid overlapping the padding.
     */
    contentPadding?: GoogleMapsContentPadding;
    /**
     * Lambda invoked when the map is loaded.
     */
    onMapLoaded?: () => void;
    /**
     * Lambda invoked when the user clicks on the map.
     * It won't be invoked if the user clicks on POI or a marker.
     */
    onMapClick?: (event: {
        coordinates: Coordinates;
    }) => void;
    /**
     * Lambda invoked when the user long presses on the map.
     */
    onMapLongClick?: (event: {
        coordinates: Coordinates;
    }) => void;
    /**
     * Lambda invoked when a POI is clicked.
     */
    onPOIClick?: (event: {
        name: string;
        coordinates: Coordinates;
    }) => void;
    /**
     * Lambda invoked when the marker is clicked
     */
    onMarkerClick?: (event: GoogleMapsMarker) => void;
    /**
     * Lambda invoked when the polyline is clicked.
     */
    onPolylineClick?: (event: GoogleMapsPolyline) => void;
    /**
     * Lambda invoked when the polygon is clicked.
     */
    onPolygonClick?: (event: GoogleMapsPolygon) => void;
    /**
     * Lambda invoked when the circle is clicked.
     */
    onCircleClick?: (event: GoogleMapsCircle) => void;
    /**
     * Lambda invoked when the map was moved by the user.
     */
    onCameraMove?: (event: {
        coordinates: Coordinates;
        zoom: number;
        tilt: number;
        bearing: number;
    }) => void;
};
/**

```

---

## Assistant (Build · DeepSeek V4 Flash Free · 5.5s)

_Thinking:_

Confirmed: **expo-maps GoogleMapsView has NO POI toggle and no local style JSON support** (only `mapId` from Google Cloud → paid). So on Android, we cannot strip POIs via expo-maps. On iOS, `pointsOfInterest: { including: [] }` hides all POIs.

Wait — but actually, hmm. The mission says the screenshots show stock Google POI icons (bus stops, mall). If the primary device is Android with Google Maps via expo-maps, there's genuinely no supported way to remove them with this library. The honest fix within the mission constraints:
1. iOS: `pointsOfInterest: { including: [] }` (fully supported).
2. Android: disable `isBuildingEnabled`, `isIndoorEnabled`, `isTrafficEnabled` to reduce clutter, and use `selectionEnabled: false`. Document the limitation clearly in the audit and code comments, per the mission's own instruction: "Audit what the map library actually supports before writing anything."

Hmm, wait — actually, let me double check: is there a `mapStyleOptions` raw JSON that works on Android without mapId in expo-maps 0.12? The type doc says "With style options you can customize the presentation of the standard Google map styles". Let me check the Android native module to see if it applies the JSON directly or requires a mapId. Let me grep the android source if available.

**Tool: bash**

**Input:**
```json
{
  "command": "ls node_modules/expo-maps/android/src/main/java/expo/modules/maps/ 2>/dev/null | head -30; echo ===; grep -rn \"mapStyleOptions\\|setMapStyle\\|GoogleMapOptions\\|json\" node_modules/expo-maps/android/src/main/java/expo/modules/maps/*.kt 2>/dev/null | head -20"
}
```

**Output:**
```
CustomLocationSource.kt
GoogleMapsModule.kt
GoogleMapsView.kt
GoogleStreetView.kt
MapsModule.kt
Records.kt
StreetViewModule.kt
===
node_modules/expo-maps/android/src/main/java/expo/modules/maps/GoogleMapsView.kt:45:import com.google.android.gms.maps.GoogleMapOptions
node_modules/expo-maps/android/src/main/java/expo/modules/maps/GoogleMapsView.kt:91:    val mapOptions = props.mapOptions.value.mapId?.let { GoogleMapOptions().mapId(it) } ?: GoogleMapOptions()
node_modules/expo-maps/android/src/main/java/expo/modules/maps/Records.kt:215:  val json: String
node_modules/expo-maps/android/src/main/java/expo/modules/maps/Records.kt:230:  val mapStyleOptions: MapStyleOptionsRecord? = null,
node_modules/expo-maps/android/src/main/java/expo/modules/maps/Records.kt:239:    val mapStyleOptionsParsed = mapStyleOptions?.json?.let { MapStyleOptions(it) }
node_modules/expo-maps/android/src/main/java/expo/modules/maps/Records.kt:245:      mapStyleOptions = mapStyleOptionsParsed,

```

---

## Assistant (Build · DeepSeek V4 Flash Free · 4.7s)

**Tool: bash**

**Input:**
```json
{
  "command": "sed -n '205,250p' node_modules/expo-maps/android/src/main/java/expo/modules/maps/Records.kt"
}
```

**Output:**
```
      HYBRID -> MapType.HYBRID
      NORMAL -> MapType.NORMAL
      SATELLITE -> MapType.SATELLITE
      TERRAIN -> MapType.TERRAIN
    }
  }
}

data class MapStyleOptionsRecord(
  @Field
  val json: String
) : Record

data class MapPropertiesRecord(
  @Field
  val isBuildingEnabled: Boolean = false,
  @Field
  val isIndoorEnabled: Boolean = false,
  @Field
  val isMyLocationEnabled: Boolean = false,
  @Field
  val isTrafficEnabled: Boolean = false,
  // TODO(@lukmccall): supports these properties
  //  val latLngBoundsForCameraTarget: LatLngBounds? = null,
  @Field
  val mapStyleOptions: MapStyleOptionsRecord? = null,
  @Field
  val mapType: MapTypeEnum = MapTypeEnum.NORMAL,
  @Field
  val maxZoomPreference: Float = 21.0f,
  @Field
  val minZoomPreference: Float = 3.0f
) : Record {
  fun toMapProperties(): MapProperties {
    val mapStyleOptionsParsed = mapStyleOptions?.json?.let { MapStyleOptions(it) }
    return MapProperties(
      isBuildingEnabled = isBuildingEnabled,
      isIndoorEnabled = isIndoorEnabled,
      isMyLocationEnabled = isMyLocationEnabled,
      isTrafficEnabled = isTrafficEnabled,
      mapStyleOptions = mapStyleOptionsParsed,
      mapType = mapType.toMapType(),
      maxZoomPreference = maxZoomPreference,
      minZoomPreference = minZoomPreference
    )
  }

```

---

## Assistant (Build · DeepSeek V4 Flash Free · 9.0s)

_Thinking:_

Very interesting! On Android, `MapStyleOptions(json)` IS supported directly — the native code parses the raw JSON style into `com.google.android.gms.maps.model.MapStyleOptions`. Let me verify that `MapStyleOptions(json)` (the string constructor) works without a mapId — yes, in the Android Maps SDK, `MapStyleOptions(String json)` applies the raw JSON style directly (the cloud mapId is an alternative). The Google Maps Android SDK still supports the JSON string constructor (style via mapstyle.withgoogle.com JSON). It's the old "setStyle(json)" path — still functional in the SDK.

Wait, let me double-check: In recent Google Maps SDK versions (v18+), does `MapStyleOptions(String)` still work? Yes — `MapStyleOptions(String json)` is still supported. The deprecation was about... hmm, actually `MapStyleOptions.fromJson(String)` and the constructor remain supported; cloud map IDs add more features. Actually let me check GoogleMapsView.kt to see if mapStyleOptions is applied.

Also note: `mapStyleOptions` is NOT in the type declarations I saw for GoogleMapsProperties? Let me re-check: GoogleMapsProperties has `mapStyleOptions?: GoogleMapsMapStyleOptions;` — YES it does (line 271-272 area in the earlier output: "mapStyleOptions?: GoogleMapsMapStyleOptions"). And the MapStyleOptionsRecord JSON is passed via properties.mapStyleOptions. 

So on **Android we CAN pass a raw style JSON** via `properties.mapStyleOptions = { json: "..." }`! That means the POI-stripping style JSON fix IS possible for the Google (Android) map. And on iOS, `pointsOfInterest: { including: [] }` hides all POIs.

Let me confirm GoogleMapsView.kt applies mapStyleOptions.

**Tool: bash**

**Input:**
```json
{
  "command": "grep -n \"mapStyleOptions\\|MapStyleOptions\\|setMapStyle\\|applyMapProperties\\|toMapProperties\" node_modules/expo-maps/android/src/main/java/expo/modules/maps/GoogleMapsView.kt | head; echo ===; grep -rn \"POI\\|poi\\|setOnPoiClick\" node_modules/expo-maps/android/src/main/java/expo/modules/maps/GoogleMapsView.kt | head"
}
```

**Output:**
```
98:      properties = props.properties.value.toMapProperties(),
===
70:  private val onPOIClick by EventDispatcher<POIRecord>()
120:      onPOIClick = { poi ->
121:        onPOIClick(
122:          POIRecord(
123:            poi.name,
124:            Coordinates(poi.latLng.latitude, poi.latLng.longitude)
143:          points = coordinates,
311:        points = coordinates,

```

---

## Assistant (Build · DeepSeek V4 Flash Free · 2.4s)

**Tool: bash**

**Input:**
```json
{
  "command": "sed -n '85,110p' node_modules/expo-maps/android/src/main/java/expo/modules/maps/GoogleMapsView.kt"
}
```

**Output:**
```
    cameraState = updateCameraState()
    val markerState = markerStateFromProps()
    val locationSource = locationSourceFromProps()
    val polylineState by polylineStateFromProps()
    val polygonState by polygonStateFromProps()
    val circleState by circleStateFromProps()
    val mapOptions = props.mapOptions.value.mapId?.let { GoogleMapOptions().mapId(it) } ?: GoogleMapOptions()

    GoogleMap(
      googleMapOptionsFactory = { mapOptions },
      modifier = Modifier.fillMaxSize(),
      cameraPositionState = cameraState,
      uiSettings = props.uiSettings.value.toMapUiSettings(),
      properties = props.properties.value.toMapProperties(),
      contentPadding = props.contentPadding.value.let {
        PaddingValues(start = it.start.dp, end = it.end.dp, top = it.top.dp, bottom = it.bottom.dp)
      },
      onMapLoaded = {
        onMapLoaded(Unit)
        wasLoaded.value = true
      },
      onMapClick = { latLng ->
        onMapClick(
          MapClickEvent(
            Coordinates(latLng.latitude, latLng.longitude)
          )

```

---

## Assistant (Build · DeepSeek V4 Flash Free · 7.5s)

_Thinking:_

Confirmed: `properties.toMapProperties()` includes `mapStyleOptions` (raw JSON → `MapStyleOptions(json)`), passed into the GoogleMap. So **Android CAN accept a POI-stripping style JSON**. On iOS, `pointsOfInterest: { including: [] }`.

Now let me check the remaining audit targets for Phase 1 & 2:
- Enrollment.tsx tabs
- FiltersSheet.tsx (map filter alignment)
- useTutorClustering.ts
- markerIcons.ts
- avatarPins.ts
- TutorHome.tsx (header, bell)
- AdminHome (bell)
- StudentProfile / EditProfile notification prefs section
- TutorBottomBar.tsx (tone pattern reference for 1.1)
- ScreenLayout (ScreenHeader/scroll for seam)
- tailwind.config.js tokens full list (sand, accent-light, verification etc.)

Let me batch.

Phase 2 audit is shaping up (Android: style JSON works; iOS: `pointsOfInterest.including: []`). Now the remaining Phase 1 targets + Phase 3 dashboards.

**Tool: read**

**Input:**
```json
{
  "filePath": "/media/xlegion/Win/PROJECTS/EdumentX/src/screens/student/Enrollment.tsx",
  "limit": 120
}
```

**Output:**
```
<path>/media/xlegion/Win/PROJECTS/EdumentX/src/screens/student/Enrollment.tsx</path>
<type>file</type>
<content>
1: /**
2:  * EdumentX — My Enrollments (student)
3:  *
4:  * Phase 6 (Aug 3, 2026) — wired to live Firestore data.
5:  *
6:  * Three tabs: Active / Pending / Past.
7:  *
8:  *   - Pending tab = live `subscribeRequestsByStudent(studentUid)`
9:  *     collectionGroup query over `enrollmentRequests/*\/requests`.
10:  *     Filters by `status === "pending"`.
11:  *   - Active tab = live `subscribeEnrollmentsByStudent(studentUid)`
12:  *     filtered by `status === "active"`.
13:  *   - Past tab = same subscription, filtered by
14:  *     `status in ["removed", "expired"]`.
15:  *
16:  * Tapping a card navigates to `/tutor/{tutorUid}` so the student can
17:  * view the tutor's full profile (TutorDetailsScreen). When the card
18:  * is in the Pending tab, the tutor's other actions are read-only —
19:  * the student is waiting on the tutor's decision.
20:  *
21:  * Empty states per tab:
22:  *   - Pending:  "No pending requests" + helper
23:  *   - Active:   "No active enrollments" + "Find a tutor" CTA → /map-search
24:  *   - Past:     "No past enrollments" + helper
25:  *
26:  * Old mock data path (Phase 4) is preserved for offline / dev
27:  * parity but only used when `EXPO_PUBLIC_USE_MOCK_DATA=true` — the
28:  * repository selector at `services/enrollments/dataSource.ts`
29:  * already swaps implementations.
30:  */
31: 
32: import { Ionicons } from "@expo/vector-icons";
33: import { useRouter } from "expo-router";
34: import { useEffect, useMemo, useState } from "react";
35: import { Alert, Pressable, Text, View } from "react-native";
36: 
37: import { ActivePill } from "@/components/motion";
38: import { BottomNav } from "@/components/shared/BottomNav";
39: import {
40:   ScreenLayout,
41:   ScreenHeader,
42:   ScreenScroll,
43: } from "@/components/shared/ScreenLayout";
44: import { colors } from "@/constants/colors";
45: 
46: import { useAuthStore } from "@/store/authStore";
47: import { getEnrollmentRepository } from "@/services/enrollments/dataSource";
48: import type {
49:   Enrollment as LiveEnrollment,
50:   EnrollmentRequest as LiveEnrollmentRequest,
51: } from "@/services/enrollments/types";
52: import { todayIsoInKtm } from "@/services/enrollments/derived";
53: import { ReviewModal } from "@/components/domain/ReviewModal";
54: import { EditRequestSheet } from "@/components/domain/EditRequestSheet";
55: 
56: import { getApp } from "@react-native-firebase/app";
57: import {
58:   getFirestore,
59:   doc,
60:   updateDoc,
61:   serverTimestamp,
62: } from "@react-native-firebase/firestore";
63: 
64: // ─── Tab model ────────────────────────────────────────────────────────────────
65: 
66: type Tab = "active" | "pending" | "past";
67: 
68: const TAB_LABELS: Record<Tab, string> = {
69:   active: "Active",
70:   pending: "Pending",
71:   past: "Past",
72: };
73: 
74: // ─── Screen ─────────────────────────────────────────────────────────────────
75: 
76: export function MyEnrollments() {
77:   const router = useRouter();
78:   const studentUid = useAuthStore((s) => s.user?.uid ?? null);
79:   const [tab, setTab] = useState<Tab>("active");
80:   const [requests, setRequests] = useState<LiveEnrollmentRequest[]>([]);
81:   const [enrollments, setEnrollments] = useState<LiveEnrollment[]>([]);
82:   const [hasLoadedRequests, setHasLoadedRequests] = useState(false);
83:   const [hasLoadedEnrollments, setHasLoadedEnrollments] = useState(false);
84:   const [reviewModalFor, setReviewModalFor] = useState<{
85:     tutorUid: string;
86:     tutorName: string;
87:   } | null>(null);
88:   // The request the student has tapped "Edit" on. The sheet
89:   // pre-fills from this and writes back via the repo on save.
90:   const [editingRequest, setEditingRequest] =
91:     useState<LiveEnrollmentRequest | null>(null);
92: 
93:   // Live subscription — student's own requests
94:   useEffect(() => {
95:     if (!studentUid) {
96:       setRequests([]);
97:       setHasLoadedRequests(true);
98:       return;
99:     }
100:     const repo = getEnrollmentRepository();
101:     const unsub = repo.subscribeRequestsByStudent(
102:       studentUid,
103:       (list) => {
104:         setRequests(list);
105:         setHasLoadedRequests(true);
106:       },
107:       (err) => {
108:         console.warn("Enrollment.tsx: subscribeRequestsByStudent failed", err);
109:         setHasLoadedRequests(true);
110:       },
111:     );
112:     return unsub;
113:   }, [studentUid]);
114: 
115:   // Live subscription — student's own enrollments (active + past)
116:   useEffect(() => {
117:     if (!studentUid) {
118:       setEnrollments([]);
119:       setHasLoadedEnrollments(true);
120:       return;

(Showing lines 1-120 of 843. Use offset=121 to continue.)
</content>
```

**Tool: bash**

**Input:**
```json
{
  "command": "grep -n \"ActivePill\\|pillClassName\\|activeTab\\|bg-primary\\|h-12\\|rounded-t\\|font-semibold\\|border-b\" src/screens/student/Enrollment.tsx | head -30"
}
```

**Output:**
```
37:import { ActivePill } from "@/components/motion";
393:      className="bg-surface border border-border rounded-card p-4 border-l-4 border-l-accent active:opacity-80"
400:        <View className="w-avatar-card h-avatar-card rounded-pill bg-surface-muted border border-border items-center justify-center">
521:      className={`bg-surface border border-border rounded-card p-4 ${statusStripe} active:opacity-80`}
524:        <View className="w-avatar-card h-avatar-card rounded-pill bg-surface-muted border border-border items-center justify-center">
689:          <Text className="text-button text-text-inverse font-semibold">
764: * signaled by a single sliding `ActivePill` behind the labels, with
766: * per-tab `bg-primary` class-swap.
781:      className="flex-row bg-surface border-b border-border shrink-0 relative"
785:        <ActivePill
789:          pillClassName="absolute top-0 h-12 bg-primary"
808:            className="flex-1 h-12 flex-row items-center justify-center gap-1.5 active:opacity-70 z-10"
830:                      ? "text-micro text-black font-semibold"
831:                      : "text-micro text-text-muted font-semibold"

```

---

## Assistant (Build · DeepSeek V4 Flash Free · 5.0s)

**Tool: read**

**Input:**
```json
{
  "filePath": "/media/xlegion/Win/PROJECTS/EdumentX/src/screens/student/Enrollment.tsx",
  "limit": 90,
  "offset": 755
}
```

**Output:**
```
<path>/media/xlegion/Win/PROJECTS/EdumentX/src/screens/student/Enrollment.tsx</path>
<type>file</type>
<content>
755:   );
756: }
757: 
758: // ─── Sub-components ──────────────────────────────────────────────────────────
759: 
760: const TABS_ORDER: Tab[] = ["active", "pending", "past"];
761: 
762: /**
763:  * Three-tab top bar (Active / Pending / Past). The active tab is
764:  * signaled by a single sliding `ActivePill` behind the labels, with
765:  * the count chip and label color swapping to match. Replaces the
766:  * per-tab `bg-primary` class-swap.
767:  */
768: function EnrollmentTabs({
769:   active,
770:   onChange,
771:   counts,
772: }: {
773:   active: Tab;
774:   onChange: (tab: Tab) => void;
775:   counts: Record<Tab, number>;
776: }) {
777:   const [width, setWidth] = useState(0);
778:   const activeIndex = Math.max(0, TABS_ORDER.indexOf(active));
779:   return (
780:     <View
781:       className="flex-row bg-surface border-b border-border shrink-0 relative"
782:       onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
783:     >
784:       {width > 0 ? (
785:         <ActivePill
786:           count={TABS_ORDER.length}
787:           activeIndex={activeIndex}
788:           itemWidth={width / TABS_ORDER.length}
789:           pillClassName="absolute top-0 h-12 bg-primary"
790:           style={{
791:             top: 0,
792:             height: 48,
793:             width: width / TABS_ORDER.length,
794:             backgroundColor: "#2F5D50",
795:           }}
796:         />
797:       ) : null}
798:       {TABS_ORDER.map((t, i) => {
799:         const isActive = i === activeIndex;
800:         const count = counts[t];
801:         return (
802:           <Pressable
803:             key={t}
804:             accessibilityRole="tab"
805:             accessibilityLabel={TAB_LABELS[t]}
806:             accessibilityState={{ selected: isActive }}
807:             onPress={() => onChange(t)}
808:             className="flex-1 h-12 flex-row items-center justify-center gap-1.5 active:opacity-70 z-10"
809:           >
810:             <Text
811:               className={
812:                 isActive
813:                   ? "text-button font-medium text-black"
814:                   : "text-button font-medium text-text-muted"
815:               }
816:             >
817:               {TAB_LABELS[t]}
818:             </Text>
819:             {count > 0 ? (
820:               <View
821:                 className={
822:                   isActive
823:                     ? "min-w-[20px] h-5 px-1.5 rounded-pill bg-black/20 items-center justify-center"
824:                     : "min-w-[20px] h-5 px-1.5 rounded-pill bg-sand items-center justify-center"
825:                 }
826:               >
827:                 <Text
828:                   className={
829:                     isActive
830:                       ? "text-micro text-black font-semibold"
831:                       : "text-micro text-text-muted font-semibold"
832:                   }
833:                 >
834:                   {count}
835:                 </Text>
836:               </View>
837:             ) : null}
838:           </Pressable>
839:         );
840:       })}
841:     </View>
842:   );
843: }

(End of file - total 843 lines)
</content>
```

---

## Assistant (Build · DeepSeek V4 Flash Free · 22.7s)

_Thinking:_

Enrollment tabs already use the sliding `ActivePill` (bg-primary #2F5D50) — the active indicator exists. The mission item 1.5 says "the active tab has no clear indicator — just bolder text" — but the current code has a filled pill + black text. So this item is already satisfied. Good.

Now — one inconsistency: the pill is green (`#2F5D50` = brand.primary) on Enrollment, while the bottom nav dark tone uses amber for "you are here". But Enrollments uses the LIGHT bottom nav (green active pill). So it's consistent within its tone family. The mission says "matching the bottom nav's active tab language". The light BottomNav uses green pill; Enrollment uses green pill. Consistent. ✓ Already fine.

Now let me look at the remaining items:
- StudentHome: BottomNav tone="dark" — the code renders the floating glass dock with all 5 tabs. The mission says it renders "a single collapsed pill (just a house icon)". Looking at the current code, TabRow renders 5 TabButtons... The bug may be real on-device though: `bg-glass` is `rgba(255,255,255,0.06)` — nearly transparent. With `shadow-[0_10px_30px_rgba(0,0,0,0.45)]`... The dock would be very dark. But "single collapsed pill just a house icon" doesn't match any code path.

Hmm, wait — maybe the mission's screenshot was taken BEFORE the dark dock existed (the mission said "renders as a single collapsed pill (just a house icon)"). The BottomNav I read has the two-tone system fully implemented with a comment about "Phase 3b". So this was already fixed in a prior session (Phase 3b was a previous mission). Since git status shows BottomNav.tsx is modified (uncommitted), the work exists in the working tree.

The mission explicitly says: "Unless the reporter is wrong — verify on device/screenshot — the fix below is a complete rewrite..." I can't see the screenshots, but I CAN verify from code that the two-tone system is implemented. The reporter may have been describing a stale build, OR there's a subtle bug. Let me look closely at the dark TabRow: for dark tone, `activeIndex` pill is NOT rendered (only light tone renders the pill), and the amber dot renders below the icon. Labels render. That's a full 5-tab dock. There's no path where it collapses to a single house icon.

Wait — could it be the `bg-glass` on the HOME screen? No. Let me check ScreenLayout variant="night" to make sure the layout renders the nav properly, and check whether `BottomNav` gets hidden by overflow. Actually — maybe the issue: `ScreenLayout` might use `SafeAreaView` bottom insets, and the dark dock `pb-3`... no, that wouldn't collapse to one icon.

Let me check if there's a DIFFERENT bottom nav rendered in StudentHome via ScreenLayout. ScreenLayout takes `children` and maybe a `footer`? Let me read ScreenLayout.

Also — the mission screenshots: "1) student Home... 2) 'Explore tutors on the map' CTA ghosted near-transparent white-on-navy... 3) hard seam between dark hero and light content... 4) verified badge clipping". Let me evaluate each against code:

1. **Bottom nav** — current code implements full two-tone. Need to verify on-device; can't here. But wait — maybe the actual rendering IS broken. The `TabRow` for dark: `tone === "light" && width > 0 ? <Animated.View/> : null` — fine. TabButton dark: icon + dot + label. The dock: `bg-glass` = rgba(255,255,255,0.06) — over `bg-night-deep` this is nearly invisible, but the hairline + shadow give definition. Hmm, "collapsed pill just a house icon" — I really can't reproduce this from code.

   Hmm, hold on. Let me reconsider. Maybe the reporter saw the LIGHT bar (default tone) on the dark home screen: `bg-surface` white bar with the sliding green pill on the first (Home) tab — that would look like a wide white bar with a green pill hugging the house icon! "A single collapsed pill (just a house icon)" — YES! If `tone="dark"` prop were NOT being passed (or the dark branch failing), the home screen would render the default LIGHT bar: white `bg-surface` strip with the green active pill around only the Home icon at the left edge. With only the first tab's pill visible... wait, the pill would be around the first tab (Home), and the other 4 tabs would still show their icons/labels. Hmm, unless the labels+icons at the right get cut off... no.

   OR — the "collapsed pill" could be the **light bar rendering on dark** where everything is white-on-white... I can't fully resolve without seeing the screenshot. The safest action per the mission: verify code path, ensure tone="dark" is applied (it is, line 359), and note that the two-tone dock is implemented. Since I can't run the app, I'll re-verify the rendering logic and confirm there's no bug, and note it in the audit as "already implemented — reporter likely saw a stale build; flag for on-device confirm".

   Actually — wait. Let me look again very carefully at the dark branch. `View className="px-4 pt-2 pb-3"` → inner `View className="flex-row relative rounded-3xl bg-glass border glass-border px-1 py-1 ..."`. Hmm — `border glass-border` — NativeWind: `border` sets border-width 1, `glass-border` sets color. OK. TabRow with `width` state → `tabWidth = width/5`. Pill not rendered in dark. Fine.

   Everything checks out. I'll treat 1.1 as "already implemented in the working tree (uncommitted), verify on device". BUT the mission says the screenshots show it broken... Let me check whether StudentHome is what's rendered at /student-home — yes. Hmm, is there any chance the git working tree differs from the built app? The user rebuilt the dev client? The BottomNav.tsx has "Phase 3b" comments — clearly already implemented.

   Decision: Audit note — 1.1 is already fixed in the working tree (two-tone dock exists, tone="dark" wired on Home). I'll do a careful pass of the dark dock for any rendering bug (e.g. missing width measurement on first frame causing pill misplacement — but pill isn't used in dark). I'll flag "verify on device; if the screenshot still shows the collapsed state, it's a stale build".

2. **Ghosted CTA** — the current CTA is `bg-amber` (solid amber, `#E5A03B`) with `text-night` label — HIGH contrast, clearly visible. The mission says it's "near-transparent white-on-navy". The current code does NOT match that description. Again — already fixed? The comment says "Primary CTA — the ONLY amber surface on this screen. Amber is reserved for high-priority actions". So this was already fixed in a prior session.

   Hmm wait — but the mission is describing the CURRENT screenshots. If both 1.1 and 1.2 are already fixed in the working tree, maybe the mission brief was written before these Premium UI passes and the screenshots are from the old build. OR the screenshots show something different. Since I can't see them, I'll verify code-level and report.

3. **Seam dark→light** — StudentHome: `ScreenHeader` (night hero) then `ScreenScroll className="flex-1 bg-night-deep"` — the whole home screen is dark! No light seam on Home. MapSearch: `bg-night` hero then `flex-1 bg-background` map area — hard seam between the night header and the light map area (line 281-284: `View className="flex-1 bg-background"` with `bg-night px-5 pt-14 pb-4` header, then the map `flex-1`). The mission says "the dark header just ends and light content begins — hard seam". On MapSearch, the seam exists between the dark header and the map. The fix: rounded-top light sheet overlapping the dark hero 12-16px, like TutorBottomBar/other premium screens. Let me check what other screens do — e.g., Enrollment or AIChat — do they have a rounded seam? Let me check. Actually the mission says "the premium dark-hero → light-sheet pattern used by the other premium screens". Let me check AIChat or Notification for that pattern.

4. **Verified badge clipping** — TutorCard WideCard: the badge is inline next to the name (`-ml-0.5` checkmark-circle, not clipped). CompactCard: NO badge at all. The mission says "the green verified badge clips at the card's right edge" and "compact shows no badge". The current code: WideCard badge is next to the name (not clipped); CompactCard has none. TutorPreviewSheet has a green pill checkmark next to the name (line 92-96) — that one's fine.

   Hmm, the clipping could be from a different surface — maybe TutorDetailsScreen or the enrollment cards? Let me grep for "checkmark" across components.

Let me now check ScreenLayout, the seam pattern in AIChat/Notification, and grep for checkmark badges. Also check TutorBottomBar (for the tone system reference), TutorHome header (bell), AdminHome (bell), StudentProfile/TutorProfile (notifications prefs), and FiltersSheet.

Enrollment tabs already have a sliding pill (1.5 likely already satisfied). Let me check the seam pattern, badges, and dashboard headers.

**Tool: bash**

**Input:**
```json
{
  "command": "grep -rn \"checkmark\" src/components/ src/screens/ --include=\"*.tsx\" | grep -v \"Notification\" | head -20; echo \"=== rounded seam pattern ===\"; grep -rn \"rounded-t\" src/screens/ | head -15"
}
```

**Output:**
```
src/components/domain/StudentAvailabilityGrid.tsx:33: *   Available           bg-verification-light, border-verification, checkmark
src/components/domain/StudentAvailabilityGrid.tsx:34: *   Selected            bg-verification-light, border-2 border-accent, checkmark
src/components/domain/StudentAvailabilityGrid.tsx:305:      icon: "checkmark",
src/components/domain/StudentAvailabilityGrid.tsx:317:      icon: "checkmark",
src/components/domain/StudentPickerSheet.tsx:205:        {selected ? <Ionicons name="checkmark" size={14} color="#FFFFFF" /> : null}
src/components/domain/TutorCard.tsx:230:                    name="checkmark-circle"
src/components/domain/WeeklyAvailabilityGrid.tsx:126:      icon: "checkmark",
src/components/forms/AvatarUploader.tsx:21:   * inline checkmark other validated fields show.
src/components/forms/AvatarUploader.tsx:38: * is uploaded, and a green ring + checkmark when one is. No colors-only
src/components/forms/AvatarUploader.tsx:148:            <Ionicons name="checkmark" size={14} color="#FFFFFF" />
src/components/forms/DocumentUploader.tsx:109:                <Ionicons name="checkmark-circle" size={11} color="#3F8A5A" />
src/components/forms/DocumentUploader.tsx:361:            name="checkmark-circle"
src/components/forms/NameEmailFields.tsx:29:   * `valid` drives the inline checkmark. `error` drives the danger
src/components/forms/NameEmailFields.tsx:51:  // focus + shake + checkmark) or by the legacy class-swap
src/components/forms/SearchableSelect.tsx:54:  /** If present and true, show a valid checkmark. */
src/components/forms/SearchableSelect.tsx:238:          <Ionicons color={colors.semantic.success} name="checkmark-circle" size={18} />
src/components/map/TutorAvatarPin.tsx:114:            <Ionicons name="shield-checkmark" size={10} color={WHITE} />
src/components/map/TutorPreviewSheet.tsx:94:                      <Ionicons name="checkmark" size={10} color="white" />
src/components/motion/FieldShell.tsx:12: *   - `value`   : the current input value (used to drive the checkmark
src/components/motion/FieldShell.tsx:15: *   - `valid`   : boolean — drives the inline checkmark.
=== rounded seam pattern ===
src/screens/shared/Notification.tsx:540:          className="bg-surface rounded-t-[20px] pt-2.5 pb-8 max-h-[90%]"
src/screens/student/AIChat.tsx:416:            ? "max-w-[78%] bg-primary-light rounded-card rounded-tr-sm p-3"
src/screens/student/AIChat.tsx:418:              ? "max-w-[78%] bg-danger-bg border border-danger rounded-card rounded-tl-sm p-3"
src/screens/student/AIChat.tsx:419:              : "max-w-[78%] bg-surface border border-border rounded-card rounded-tl-sm p-3"
src/screens/student/AIChat.tsx:485:      <View className="bg-surface border border-border rounded-card rounded-tl-sm px-3 py-3 flex-row items-center gap-2">
src/screens/tutor/BatchCreation.tsx:163:          <View className="bg-surface rounded-t-3xl h-[85%] p-6">

```

**Tool: bash**

**Input:**
```json
{
  "command": "grep -n \"bell\\|notification\\|Notifications\\|/notification\" src/screens/tutor/TutorHome.tsx src/screens/admin/AdminHome.tsx src/screens/student/StudentProfile.tsx src/screens/tutor/EditProfile.tsx 2>/dev/null | head -20; echo ===; ls src/screens/admin/ 2>/dev/null; ls src/screens/student/ | head"
}
```

**Output:**
```
src/screens/student/StudentProfile.tsx:47: *   - Notifications section is a "Coming soon" placeholder, per
src/screens/student/StudentProfile.tsx:323:        {/* Notifications — routes to the shared notification center
src/screens/student/StudentProfile.tsx:324:            (per spec: "wherever notification is displayed, route to
src/screens/student/StudentProfile.tsx:325:            notification center"). The badge shows the unread count
src/screens/student/StudentProfile.tsx:329:            Notifications
src/screens/student/StudentProfile.tsx:333:            accessibilityLabel="Open notifications"
src/screens/student/StudentProfile.tsx:334:            onPress={() => router.push("/notification")}
src/screens/student/StudentProfile.tsx:338:              <Ionicons name="notifications-outline" size={18} color="#E5A03B" />
src/screens/student/StudentProfile.tsx:348:                Notifications
===
AdminHome.tsx
AdminProfile.tsx
PlatformStatistics.tsx
UserManagement.tsx
VerificationQueue.tsx
AIChat.tsx
Enrollment.tsx
FiltersSheet.tsx
MapSearch.tsx
StudentHome.tsx
StudentProfile.tsx
TutorDetailsScreen.tsx

```

---

## Assistant (Build · DeepSeek V4 Flash Free · 5.6s)

**Tool: read**

**Input:**
```json
{
  "filePath": "/media/xlegion/Win/PROJECTS/EdumentX/src/screens/student/StudentProfile.tsx",
  "limit": 60,
  "offset": 300
}
```

**Output:**
```
<path>/media/xlegion/Win/PROJECTS/EdumentX/src/screens/student/StudentProfile.tsx</path>
<type>file</type>
<content>
300:                 Email
301:               </Text>
302:             <View className="flex-row items-center justify-between bg-surface-muted border border-border rounded-card h-input px-4">
303:                 <Text
304:                   className="text-body-lg text-text-secondary flex-1"
305:                   numberOfLines={1}
306:                 >
307:                   {user?.email ?? "Not signed in"}
308:                 </Text>
309:               <View className="flex-row items-center gap-1 bg-success-bg rounded-pill px-2 py-1">
310:                 <Ionicons name="checkmark-circle" size={11} color="#3F8A5A" />
311:                 <Text className="text-micro text-success-text font-medium">
312:                   Verified
313:                 </Text>
314:               </View>
315:             </View>
316:             <Text className="text-caption text-text-muted mt-1.5">
317:               Email is managed by Firebase Auth and can&apos;t be edited
318:               from here.
319:             </Text>
320:           </View>
321:         </View>
322: 
323:         {/* Notifications — routes to the shared notification center
324:             (per spec: "wherever notification is displayed, route to
325:             notification center"). The badge shows the unread count
326:             from the mock list so the affordance feels live. */}
327:         <View className="mt-7">
328:           <Text className="text-label text-ink-muted mb-2">
329:             Notifications
330:           </Text>
331:           <Pressable
332:             accessibilityRole="button"
333:             accessibilityLabel="Open notifications"
334:             onPress={() => router.push("/notification")}
335:             className="flex-row items-center gap-3 bg-surface border border-border rounded-card px-4 py-3.5 active:opacity-80"
336:           >
337:             <View className="w-9 h-9 rounded-pill bg-accent-soft items-center justify-center relative">
338:               <Ionicons name="notifications-outline" size={18} color="#E5A03B" />
339:               {/* Unread badge */}
340:               <View className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-pill bg-danger items-center justify-center">
341:                 <Text className="text-[9px] text-text-inverse font-bold">
342:                   3
343:                 </Text>
344:               </View>
345:             </View>
346:             <View className="flex-1">
347:               <Text className="text-card-title text-text-primary">
348:                 Notifications
349:               </Text>
350:               <Text className="text-caption text-text-muted mt-0.5">
351:                 3 unread · messages, enrollment, AI
352:               </Text>
353:             </View>
354:             <Ionicons name="chevron-forward" size={18} color="#6B7268" />
355:           </Pressable>
356:         </View>
357: 
358:         {/* Other menu rows — all alert "Coming soon". */}
359:         <View className="mt-7">

(Showing lines 300-359 of 412. Use offset=360 to continue.)
</content>
```

**Tool: bash**

**Input:**
```json
{
  "command": "grep -n \"notifications\\|bell\\|Bell\\|/notification\" src/screens/tutor/TutorHome.tsx src/screens/admin/AdminHome.tsx src/screens/admin/AdminProfile.tsx src/screens/tutor/EditProfile.tsx 2>/dev/null | head; echo \"=== TutorHome header ===\"; grep -n \"ScreenHeader\\|header\\|View className=\\\"flex-row\" src/screens/tutor/TutorHome.tsx | head -15"
}
```

**Output:**
```
=== TutorHome header ===
11:  ScreenHeader,
388:      {/* Header — standard ScreenHeader slot */}
389:      <ScreenHeader>
390:        <View className="flex-row justify-between items-start">
399:              <View className="flex-row items-center gap-1 px-2.5 py-1 rounded-pill bg-verification-light mt-2 self-start">
425:      </ScreenHeader>
472:        <View className="flex-row flex-wrap justify-between mb-3.5">
507:          <View className="flex-row items-center gap-2 mb-2.5">
534:          <View className="flex-row items-center gap-2.5">
581:          <View className="flex-row justify-between items-center mb-2.5">
617:                    <View className="flex-row gap-2.5 items-start">
620:                        <View className="flex-row justify-between items-center">
629:                        <View className="flex-row gap-1 mt-1.5 flex-wrap">
680:                      <View className="flex-row gap-2.5 items-start">
692:                              <View className="flex-row items-center gap-1.5">

```

---

## Assistant (Build · DeepSeek V4 Flash Free · 5.7s)

_Thinking:_

Now let me look at the StudentProfile header (does it have a bell?) and TutorHome header structure, plus check the ScreenLayout. Let me read StudentProfile header area and TutorHome header.

**Tool: read**

**Input:**
```json
{
  "filePath": "/media/xlegion/Win/PROJECTS/EdumentX/src/screens/student/StudentProfile.tsx",
  "limit": 50,
  "offset": 120
}
```

**Output:**
```
<path>/media/xlegion/Win/PROJECTS/EdumentX/src/screens/student/StudentProfile.tsx</path>
<type>file</type>
<content>
120:         setName(
121:           user.displayName?.trim() ||
122:             (user.email ? user.email.split("@")[0] : "Student"),
123:         );
124:       });
125:     return () => {
126:       cancelled = true;
127:     };
128:   }, [user]);
129: 
130:   // Auto-persist `photoUrl` to Firestore whenever it changes. The
131:   // `savedPhotoUrl` gate prevents the effect from writing back what
132:   // it just read. Fire-and-forget — if it fails we log; the user
133:   // still sees the new avatar immediately because `setAvatarUri`
134:   // updated synchronously when the upload returned.
135:   useEffect(() => {
136:     if (!user) return;
137:     if (!avatarUri || avatarUri === savedPhotoUrl) return;
138:     const db = getFirestore(getApp());
139:     const profileRef = doc(db, "users", user.uid, "studentProfile", "default");
140:     setDoc(
141:       profileRef,
142:       { photoUrl: avatarUri, updatedAt: serverTimestamp() },
143:       { merge: true },
144:     )
145:       .then(() => setSavedPhotoUrl(avatarUri))
146:       .catch((err) => console.warn("StudentProfile: photoUrl persist failed", err));
147:   }, [avatarUri, savedPhotoUrl, user]);
148: 
149:   function showComingSoon(feature: string) {
150:     Alert.alert(
151:       "Coming soon",
152:       `${feature} will be available in a future update.`,
153:     );
154:   }
155: 
156:   async function pickImage() {
157:     const uid = user?.uid;
158:     if (!uid) {
159:       Alert.alert("Not signed in", "Please sign in to update your photo.");
160:       return;
161:     }
162:     const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
163:     if (status !== "granted") {
164:       Alert.alert(
165:         "Permission needed",
166:         "Allow photo access in system settings to choose a profile image.",
167:       );
168:       return;
169:     }

(Showing lines 120-169 of 412. Use offset=170 to continue.)
</content>
```

**Tool: bash**

**Input:**
```json
{
  "command": "sed -n '380,430p' src/screens/tutor/TutorHome.tsx"
}
```

**Output:**
```
  // is the last line of defense.
  if (hasLoaded && data.fullName === "") {
    return <TutorDashboardEmptyState />;
  }

  return (
    <ScreenLayout variant="night">

      {/* Header — standard ScreenHeader slot */}
      <ScreenHeader>
        <View className="flex-row justify-between items-start">
          <View>
            <Text className="text-body text-white/70">Good to see you,</Text>
            <View style={{ borderBottomWidth: 2, borderBottomColor: '#E5A03B', paddingBottom: 2, alignSelf: 'flex-start' }}>
              <Text className="text-screen-title font-medium text-white mt-0.5">
                {data.fullName}
              </Text>
            </View>
            {data.isVerifiedProfessional ? (
              <View className="flex-row items-center gap-1 px-2.5 py-1 rounded-pill bg-verification-light mt-2 self-start">
                <Ionicons name="shield-checkmark" size={12} color="#3F8A5A" />
                <Text className="text-caption text-success font-medium">
                  Verified Professional
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Availability toggle */}
        <View className="bg-white/10 rounded-2xl px-3.5 py-2.5 mt-3.5 flex-row justify-between items-center border border-glass-border">
          <View className="flex-1 pr-3">
            <Text className="text-body font-medium text-white">
              {available ? "Available for new students" : "Hidden from search"}
            </Text>
            <Text className="text-caption text-white/65 mt-0.5">
              Toggle to {available ? "pause" : "resume"} appearing in search
              results
            </Text>
          </View>
          <AvailabilitySwitch
            checked={available}
            onToggle={() => setAvailable(!available)}
          />
        </View>
      </ScreenHeader>

      {/* Under-review banner — surfaces when (a) the tutor's signup
          verification is still pending, (b) the admin requested more
          info, (c) the admin rejected the submission, or (d) the
          tutor has a `tutorProfileUpdates/{uid}` doc in `pending`

```

---

## Assistant (Build · DeepSeek V4 Flash Free · 4.8s)

_Thinking:_

Now I have a good picture of Phase 1 and Phase 3 state. Let me check the ScreenLayout component (for the seam / header structure) and the AdminHome header, plus the FilterSheet. Also check useTutorClustering + markerIcons + avatarPins + useCameraBounds for Phase 2. Let me also read ScreenLayout to see if there's a `variant="night"` scroll with seam handling, and check the tutor dashboard body (does it use night-deep below header?).

**Tool: read**

**Input:**
```json
{
  "filePath": "/media/xlegion/Win/PROJECTS/EdumentX/src/components/shared/ScreenLayout.tsx"
}
```

**Output:**
```
<path>/media/xlegion/Win/PROJECTS/EdumentX/src/components/shared/ScreenLayout.tsx</path>
<type>file</type>
<content>
1: import { StatusBar } from "react-native";
2: import { SafeAreaView } from "react-native-safe-area-context";
3: import { StatusBar as ExpoStatusBar } from "expo-status-bar";
4: import React, { type ReactNode } from "react";
5: import { ScrollView, View, type ScrollViewProps } from "react-native";
6: 
7: import { theme } from "@/constants/theme";
8: 
9: /**
10:  * EdumentX — Reusable Screen Layout
11:  *
12:  * Centralizes SafeAreaView + StatusBar (both expo for barStyle
13:  * and React Native for backgroundColor) into one component.
14:  *
15:  * Every screen should use this instead of manually repeating
16:  * SafeAreaView + StatusBar imports and JSX.
17:  *
18:  * On Android with edge-to-edge (Expo SDK 52+ default), the status
19:  * bar area is transparent. Without explicit `backgroundColor`,
20:  * Android's system scrim (default: white on light theme) shows
21:  * through — creating the "white outline" at the top of screens.
22:  * This component sets the correct `backgroundColor` on the native
23:  * status bar to match the screen's background color, completely
24:  * eliminating the outline.
25:  */
26: export type ScreenVariant = "night" | "background" | "surface" | "splash";
27: 
28: const VARIANT_CONFIG: Record<
29:   ScreenVariant,
30:   { bgClass: string; expoStyle: "light" | "dark"; bgHex: string }
31: > = {
32:   // bgHex mirrors the Tailwind class's value via `theme` tokens so the
33:   // native status-bar color and the view background can never disagree.
34:   night: {
35:     bgClass: "bg-night",
36:     expoStyle: "light",
37:     bgHex: theme.colors.ink,
38:   },
39:   background: {
40:     bgClass: "bg-background",
41:     expoStyle: "dark",
42:     bgHex: theme.colors.background,
43:   },
44:   surface: {
45:     bgClass: "bg-surface",
46:     expoStyle: "dark",
47:     bgHex: theme.colors.surface,
48:   },
49:   splash: {
50:     bgClass: "bg-splash",
51:     expoStyle: "light",
52:     bgHex: theme.colors.splash,
53:   },
54: };
55: 
56: type ScreenLayoutProps = {
57:   children: ReactNode;
58:   variant: ScreenVariant;
59: };
60: 
61: export function ScreenLayout({ children, variant }: ScreenLayoutProps) {
62:   const config = VARIANT_CONFIG[variant];
63: 
64:   return (
65:     <SafeAreaView className={`flex-1 ${config.bgClass}`}>
66:       <ExpoStatusBar style={config.expoStyle} />
67:       <StatusBar backgroundColor={config.bgHex} />
68:       {children}
69:     </SafeAreaView>
70:   );
71: }
72: 
73: // ═══════════════════════════════════════════════════════════════════════════
74: // Standardized layout primitives
75: // ═══════════════════════════════════════════════════════════════════════════
76: //
77: // These are the canonical spacing values every tab screen uses so content
78: // starts at the same vertical position on every screen (no more jumping
79: // when switching bottom tabs). `ScreenLayout` handles the safe area + status
80: // bar; `ScreenHeader` and `ScreenScroll` standardize the header and body.
81: // The structure every tab screen follows:
82: //
83: //   <ScreenLayout variant="...">
84: //     <ScreenHeader>{...title block...}</ScreenHeader>   // fixed hero
85: //     <ScreenScroll className="flex-1 bg-background">   // scrollable body
86: //       ...
87: //     </ScreenScroll>
88: //     <BottomNav />                                      // in-flow, never overlaps
89: //   </ScreenLayout>
90: //
91: // All values come from the 8px spacing grid (Phase 2 “double
92: // whitespace” pass): screen gutters are px-6 (24) like BasoBas, hero
93: // cushion pb-8 (32), body top pt-8 (32), end-of-scroll pb-12 (48).
94: 
95: /**
96:  * Dark hero header (matches the "slate" surface used by every
97:  * student / tutor / admin tab). Fixed (non-scrolling), `shrink-0` so
98:  * the scroll body can't squeeze it, and the top inset is provided by
99:  * `ScreenLayout`'s `SafeAreaView` — screens must NOT add their own
100:  * `pt-*` on top.
101:  */
102: export const SCREEN_HERO_CLASSES = "bg-night px-6 pb-8 shrink-0";
103: 
104: /**
105:  * Light header variant for surfaces that sit on a light background
106:  * (e.g. the tutor inbox, the batches screen) — same dimensions, no
107:  * dark fill, bottom hairline instead.
108:  */
109: export const SCREEN_HERO_LIGHT_CLASSES =
110:   "px-6 pb-8 shrink-0 bg-surface border-b border-border";
111: 
112: /**
113:  * Canonical scroll-body padding: `px-6` (24) gutters, `pt-8` (32)
114:  * below the header, `pb-12` (48) end-of-scroll cushion (Phase 2
115:  * “double whitespace”). The bottom nav is an in-flow sibling (never
116:  * overlapping), so no nav-height padding is needed here.
117:  */
118: export const SCREEN_CONTENT_CLASSES = "px-6 pt-8 pb-12";
119: 
120: /**
121:  * Fixed header slot. Renders the standard hero wrapper and the
122:  * standard 8px top gap (`pt-2`) beneath the status bar. `variant`
123:  * picks the dark fill (night) or the light hairline treatment.
124:  *
125:  * Screens pass their own title block as children; the children should
126:  * NOT add `mt-2` / `pt-*` — the 8px gap is baked in here.
127:  */
128: export function ScreenHeader({
129:   variant = "dark",
130:   children,
131: }: {
132:   variant?: "dark" | "light";
133:   children: ReactNode;
134: }) {
135:   return (
136:     <View
137:       className={
138:         variant === "dark" ? SCREEN_HERO_CLASSES : SCREEN_HERO_LIGHT_CLASSES
139:       }
140:     >
141:       <View className="pt-2">{children}</View>
142:     </View>
143:   );
144: }
145: 
146: /**
147:  * Canonical scroll body. A `ScrollView` preconfigured with the
148:  * standard content spacing (`SCREEN_CONTENT_CLASSES`), no scroll
149:  * indicator, and `keyboardShouldPersistTaps="handled"`.
150:  *
151:  * Override `contentContainerClassName` for the rare screen that needs
152:  * different body spacing (e.g. the AI chat's tighter bubble gutters).
153:  * `className` defaults to `flex-1`; pass `flex-1 bg-background` when
154:  * the body must sit on the light page color (common when the screen
155:  * variant is `night`).
156:  */
157: export const ScreenScroll = React.forwardRef<ScrollView, ScrollViewProps>(
158:   function ScreenScroll(
159:     { children, className, contentContainerClassName, ...rest },
160:     ref,
161:   ) {
162:     return (
163:       <ScrollView
164:         ref={ref}
165:         className={className ?? "flex-1"}
166:         contentContainerClassName={
167:           contentContainerClassName ?? SCREEN_CONTENT_CLASSES
168:         }
169:         showsVerticalScrollIndicator={false}
170:         keyboardShouldPersistTaps="handled"
171:         {...rest}
172:       >
173:         {children}
174:       </ScrollView>
175:     );
176:   },
177: );

(End of file - total 177 lines)
</content>
```

---

## Assistant (Build · DeepSeek V4 Flash Free · 6.3s)

_Thinking:_

Now let me check the FiltersSheet and the map libs (markerIcons, avatarPins, useTutorClustering) to complete the Phase 2 audit. Also the "bell" question: StudentHome header has NO bell — just greeting + search. MapSearch header has no bell either. The mission's 3.2 says "add a notification bell with an unread badge to the home headers of all three dashboards" (student-home, tutor-home, admin-home).

Wait — actually let me re-read the mission 3.2: "Add the bell + unread badge to the headers of the three dashboards (student-home, tutor-home, admin-home), reusing a small shared component. Wire the badge to a live unread count from the real notifications path (unread = read === false && type in [verification_*, edit_*, enrollment_*]). Don't touch the existing profile-screen notification row — it's already good."

OK. So I need to add a bell to all three dashboards. TutorHome header has the verified pill; AdminHome I haven't seen yet. Let me read AdminHome quickly, then FiltersSheet + the map libs. Then write the Phase 1 audit and start Phase 1 implementation.

**Tool: read**

**Input:**
```json
{
  "filePath": "/media/xlegion/Win/PROJECTS/EdumentX/src/screens/student/FiltersSheet.tsx"
}
```

**Output:**
```
<path>/media/xlegion/Win/PROJECTS/EdumentX/src/screens/student/FiltersSheet.tsx</path>
<type>file</type>
<content>
1: import { PrimaryButton } from "@/components/ui/PrimaryButton";
2: import { SecondaryButton } from "@/components/ui/SecondaryButton";
3: import { AnimatedPressable, SwitchThumb, usePressScale } from "@/components/motion";
4: import { motion } from "@/lib/motion";
5: import { Ionicons } from "@expo/vector-icons";
6: import { useEffect, useRef, useState } from "react";
7: import {
8:   Animated,
9:   Easing,
10:   Modal,
11:   PanResponder,
12:   Pressable,
13:   ScrollView,
14:   Text,
15:   View,
16: } from "react-native";
17: import RAnimated, {
18:   interpolateColor,
19:   useAnimatedStyle,
20:   useSharedValue,
21:   withTiming,
22: } from "react-native-reanimated";
23: import { colors } from "@/constants/colors";
24: 
25: /**
26:  * EdumentX — FiltersSheet (bottom-sheet overlay)
27:  *
28:  * Stage 2 (June 27, 2026):
29:  *   - This component is **not** a standalone screen. It's rendered
30:  *     inline by MapSearch as a Modal, with MapSearch visible at
31:  *     ~0.75 opacity underneath.
32:  *   - Slides up from the bottom with a spring-like easing. Drag-down
33:  *     to dismiss is wired via a PanResponder on the handle bar.
34:  *   - Filter options mirror what real tutor-search filters need
35:  *     (subject, level, mode, distance, budget, verification) but
36:  *     are UI-only — no backend query yet. "Show N results" just
37:  *     closes the sheet.
38:  *   - Visual language matches StudentHome / MapSearch: amber accent,
39:  *     verification green, surface cards, NativeWind tokens (no raw
40:  *     hex).
41:  *
42:  * Public API:
43:  *   <FiltersSheet visible={...} onClose={...} />
44:  *
45:  * The component owns all of its own state (subjects, level, mode,
46:  * distance, budget, verifiedOnly). When the user hits "Show results"
47:  * the sheet just calls `onClose()` — MapSearch is responsible for
48:  * actually applying the filter when the real `tutors` query lands in
49:  * Phase 5.
50:  */
51: 
52: const SUBJECTS = [
53:   "Math",
54:   "Physics",
55:   "Chemistry",
56:   "Biology",
57:   "English",
58:   "Nepali",
59:   "Computer",
60:   "Accounts",
61: ];
62: const LEVELS = ["Class 6-8", "SEE", "+2 Science", "+2 Mgmt", "Bachelor's"];
63: const MODES = ["Home tuition", "Online", "At tutor's place"];
64: 
65: /** Approximate "result count" so the sheet feels alive in the UI. */
66: function estimateResults(distance: number, budget: number, verifiedOnly: boolean): number {
67:   const base = 24;
68:   const distancePenalty = Math.max(0, distance - 3) * 2;
69:   const budgetPenalty = Math.max(0, (budget - 5000) / 2500) * 3;
70:   const verifiedPenalty = verifiedOnly ? 6 : 0;
71:   return Math.max(0, Math.round(base - distancePenalty - budgetPenalty - verifiedPenalty));
72: }
73: 
74: /**
75:  * Self-contained range slider. We don't import
76:  * `@react-native-community/slider` because that package isn't in
77:  * `package.json` and adding it would break the zero-budget rule
78:  * (its native module would require a rebuild of the EAS dev
79:  * client — out of scope for this stage). The implementation is a
80:  * pressable track + computed fill width, which is enough for a UI
81:  * preview.
82:  */
83: function RangeSlider({
84:   min,
85:   max,
86:   step = 1,
87:   value,
88:   onChange,
89:   trackClassName = "bg-amber",
90:   fillClassName = "bg-amber",
91: }: {
92:   min: number;
93:   max: number;
94:   step?: number;
95:   value: number;
96:   onChange: (v: number) => void;
97:   trackClassName?: string;
98:   fillClassName?: string;
99: }) {
100:   const widthRef = useRef(0);
101:   const pct = ((value - min) / (max - min)) * 100;
102: 
103:   return (
104:     <View
105:       className="h-9 justify-center"
106:       onLayout={(e) => {
107:         widthRef.current = e.nativeEvent.layout.width;
108:       }}
109:     >
110:       {/* Track */}
111:       <View className="absolute left-0 right-0 h-1 rounded-pill bg-sand" />
112:       {/* Fill */}
113:       <View
114:         className={`absolute left-0 h-1 rounded-pill ${fillClassName}`}
115:         style={{ width: `${pct}%` }}
116:       />
117:       {/* Tappable track */}
118:       <Pressable
119:         accessibilityRole="adjustable"
120:         accessibilityLabel="Adjust value"
121:         accessibilityValue={{ min, max, now: value }}
122:         onPress={(e) => {
123:           const x = e.nativeEvent.locationX;
124:           const w = widthRef.current || 1;
125:           const ratio = Math.max(0, Math.min(1, x / w));
126:           const raw = min + ratio * (max - min);
127:           const stepped = Math.round(raw / step) * step;
128:           onChange(Math.max(min, Math.min(max, stepped)));
129:         }}
130:         className="absolute inset-0"
131:       />
132:       {/* Thumb */}
133:       <View
134:         className={`absolute w-5 h-5 rounded-pill bg-surface border-2 border-amber shadow-sm`}
135:         style={{
136:           left: `${pct}%`,
137:           marginLeft: -10,
138:         }}
139:       />
140:     </View>
141:   );
142: }
143: 
144: function Section({
145:   title,
146:   children,
147: }: {
148:   title: string;
149:   children: React.ReactNode;
150: }) {
151:   return (
152:     <View className="py-4 border-b border-border">
153:       <Text className="text-overline text-text-muted uppercase mb-3">
154:         {title}
155:       </Text>
156:       {children}
157:     </View>
158:   );
159: }
160: 
161: function Pill({
162:   label,
163:   active,
164:   onPress,
165:   variant = "neutral",
166: }: {
167:   label: string;
168:   active: boolean;
169:   onPress: () => void;
170:   variant?: "neutral" | "subject";
171: }) {
172:   // Two visual languages: subjects get a teal outline when inactive
173:   // (the legacy behavior, kept for recognition), level/mode get a
174:   // simpler outlined-pill treatment.
175:   const classes =
176:     active && variant === "subject"
177:       ? "bg-accent border-accent"
178:       : active
179:         ? "bg-primary border-primary"
180:         : variant === "subject"
181:           ? "bg-verification-light border-verification-light"
182:           : "bg-surface border-border";
183:   const textClasses =
184:     active && variant === "subject"
185:       ? "text-text-inverse"
186:       : active
187:         ? "text-white"
188:         : variant === "subject"
189:           ? "text-verification-dark"
190:           : "text-text-secondary";
191:   // The Pill re-renders on every selection flip, so the hook runs
192:   // stably per Pill instance (each <Pill> in the row gets its own
193:   // press-shared value). Spring scale 0.94 = chip feel.
194:   const { onPressIn, onPressOut, animatedStyle } = usePressScale({
195:     targetScale: motion.scale.chipPressed,
196:   });
197:   return (
198:     <AnimatedPressable
199:       accessibilityRole="button"
200:       accessibilityLabel={label}
201:       accessibilityState={{ selected: active }}
202:       onPress={onPress}
203:       onPressIn={onPressIn}
204:       onPressOut={onPressOut}
205:       style={animatedStyle}
206:       className={`rounded-pill px-4 py-2 border ${classes}`}
207:     >
208:       <Text className={`text-button-sm ${textClasses}`}>{label}</Text>
209:     </AnimatedPressable>
210:   );
211: }
212: 
213: export function FiltersSheet({
214:   visible,
215:   onClose,
216: }: {
217:   visible: boolean;
218:   onClose: () => void;
219: }) {
220:   const [subjects, setSubjects] = useState<string[]>(["Math"]);
221:   const [level, setLevel] = useState("SEE");
222:   const [mode, setMode] = useState("Home tuition");
223:   const [distance, setDistance] = useState(5);
224:   const [budget, setBudget] = useState(15000);
225:   const [verifiedOnly, setVerifiedOnly] = useState(true);
226: 
227:   // Slide-up + backdrop fade. We drive both off the same Animated.Value
228:   // so they stay in sync. Spring-style easing gives a sheet-like feel
229:   // without depending on react-native-reanimated (which is already in
230:   // the project but we want this to be safe to disable later).
231:   const progress = useRef(new Animated.Value(0)).current;
232: 
233:   useEffect(() => {
234:     Animated.timing(progress, {
235:       toValue: visible ? 1 : 0,
236:       duration: 240,
237:       easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
238:       useNativeDriver: true,
239:     }).start();
240:   }, [visible, progress]);
241: 
242:   const translateY = progress.interpolate({
243:     inputRange: [0, 1],
244:     outputRange: [600, 0],
245:   });
246:   const backdropOpacity = progress.interpolate({
247:     inputRange: [0, 1],
248:     outputRange: [0, 0.55],
249:   });
250: 
251:   // Drag-down to dismiss. Threshold = 80px or fast downward velocity.
252:   const dragY = useRef(new Animated.Value(0)).current;
253:   const panResponder = useRef(
254:     PanResponder.create({
255:       onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 4,
256:       onPanResponderMove: (_, g) => {
257:         if (g.dy > 0) dragY.setValue(g.dy);
258:       },
259:       onPanResponderRelease: (_, g) => {
260:         if (g.dy > 80 || g.vy > 0.6) {
261:           onClose();
262:         }
263:         Animated.spring(dragY, {
264:           toValue: 0,
265:           useNativeDriver: true,
266:           bounciness: 4,
267:         }).start();
268:       },
269:     }),
270:   ).current;
271: 
272:   const toggleSubject = (s: string) =>
273:     setSubjects((arr) =>
274:       arr.includes(s) ? arr.filter((x) => x !== s) : [...arr, s],
275:     );
276: 
277:   const reset = () => {
278:     setSubjects([]);
279:     setLevel("");
280:     setMode("");
281:     setDistance(5);
282:     setBudget(15000);
283:     setVerifiedOnly(false);
284:   };
285: 
286:   const resultCount = estimateResults(distance, budget, verifiedOnly);
287:   // Close-button spring scale. iconPressed = 0.85 for icon-only
288:   // tap targets (back chevrons, dismiss Xs, eye toggles).
289:   const { onPressIn: onCloseIn, onPressOut: onCloseOut, animatedStyle: closeStyle } =
290:     usePressScale({ targetScale: motion.scale.iconPressed });
291: 
292:   return (
293:     <Modal
294:       visible={visible}
295:       transparent
296:       animationType="none"
297:       onRequestClose={onClose}
298:       statusBarTranslucent
299:     >
300:       <View className="flex-1">
301:         {/* Backdrop — taps dismiss. Layered behind the sheet. */}
302:         <Animated.View
303:           pointerEvents={visible ? "auto" : "none"}
304:           style={{
305:             position: "absolute",
306:             inset: 0,
307:             backgroundColor: "#000000",
308:             opacity: backdropOpacity,
309:           }}
310:         >
311:           <Pressable
312:             accessibilityRole="button"
313:             accessibilityLabel="Close filters"
314:             onPress={onClose}
315:             className="flex-1"
316:           />
317:         </Animated.View>
318: 
319:         {/* Sheet */}
320:         <Animated.View
321:           {...panResponder.panHandlers}
322:           style={{
323:             position: "absolute",
324:             left: 0,
325:             right: 0,
326:             bottom: 0,
327:             maxHeight: "90%",
328:             backgroundColor: "#FFFFFF",
329:             borderTopLeftRadius: 24,
330:             borderTopRightRadius: 24,
331:             transform: [{ translateY: Animated.add(translateY, dragY) }],
332:             shadowColor: "#26302B",
333:             shadowOpacity: 0.10,
334:             shadowRadius: 18,
335:             shadowOffset: { width: 0, height: -4 },
336:             elevation: 24,
337:           }}
338:         >
339:           {/* Handle */}
340:           <View className="items-center pt-2.5 pb-1">
341:             <View className="w-10 h-1 rounded-pill bg-surface-muted" />
342:           </View>
343: 
344:           {/* Header */}
345:           <View className="flex-row items-center py-3 px-5">
346:             <Text className="flex-1 text-section-title font-medium text-text-primary">
347:               Filters
348:             </Text>
349:             <AnimatedPressable
350:               accessibilityRole="button"
351:               accessibilityLabel="Close"
352:               onPress={onClose}
353:               onPressIn={onCloseIn}
354:               onPressOut={onCloseOut}
355:               style={closeStyle}
356:               className="w-9 h-9 items-center justify-center rounded-pill"
357:             >
358:               <Ionicons name="close" size={20} color="#6B7268" />
359:             </AnimatedPressable>
360:           </View>
361: 
362:           <ScrollView
363:             className="px-5 pt-1 pb-4"
364:             style={{ maxHeight: 480 }}
365:             showsVerticalScrollIndicator={false}
366:           >
367:             <Section title="Subject">
368:               <View className="flex-row flex-wrap gap-2">
369:                 {SUBJECTS.map((s) => (
370:                   <Pill
371:                     key={s}
372:                     label={s}
373:                     active={subjects.includes(s)}
374:                     onPress={() => toggleSubject(s)}
375:                     variant="subject"
376:                   />
377:                 ))}
378:               </View>
379:             </Section>
380: 
381:             <Section title="Level">
382:               <View className="flex-row flex-wrap gap-2">
383:                 {LEVELS.map((l) => (
384:                   <Pill
385:                     key={l}
386:                     label={l}
387:                     active={level === l}
388:                     onPress={() => setLevel(l)}
389:                   />
390:                 ))}
391:               </View>
392:             </Section>
393: 
394:             <Section title="Class mode">
395:               <View className="flex-row flex-wrap gap-2">
396:                 {MODES.map((m) => (
397:                   <Pill
398:                     key={m}
399:                     label={m}
400:                     active={mode === m}
401:                     onPress={() => setMode(m)}
402:                   />
403:                 ))}
404:               </View>
405:             </Section>
406: 
407:             <Section title={`Distance · within ${distance} km`}>
408:               <RangeSlider
409:                 min={1}
410:                 max={20}
411:                 value={distance}
412:                 onChange={setDistance}
413:               />
414:             </Section>
415: 
416:             <Section
417:               title={`Budget · up to Rs ${budget.toLocaleString()}/mo`}
418:             >
419:               <RangeSlider
420:                 min={3000}
421:                 max={30000}
422:                 step={500}
423:                 value={budget}
424:                 onChange={setBudget}
425:               />
426:             </Section>
427: 
428:             <Section title="Verification">
429:               <Pressable
430:                 accessibilityRole="switch"
431:                 accessibilityLabel="Verified tutors only"
432:                 accessibilityState={{ checked: verifiedOnly }}
433:                 onPress={() => setVerifiedOnly((v) => !v)}
434:                 className="w-full flex-row items-center justify-between bg-sand border border-border rounded-card p-3.5 active:opacity-80"
435:               >
436:                 <View className="flex-1 pr-4">
437:                   <Text className="text-card-title text-text-primary">
438:                     Verified tutors only
439:                   </Text>
440:                   <Text className="text-caption text-text-muted mt-0.5">
441:                     Show only Blue Tick Pro &amp; Student Tutors
442:                   </Text>
443:                 </View>
444:                 <FiltersVerifiedSwitch checked={verifiedOnly} />
445:               </Pressable>
446:             </Section>
447:           </ScrollView>
448: 
449:           {/* Footer */}
450:           <View className="flex-row gap-3 px-5 pt-3 pb-6 border-t border-border">
451:             <View className="flex-1">
452:               <SecondaryButton
453:                 label="Reset"
454:                 onPress={reset}
455:                 size="sm"
456:               />
457:             </View>
458:             <View className="flex-[2]">
459:               <PrimaryButton
460:                 label={`Show ${resultCount} result${resultCount === 1 ? "" : "s"}`}
461:                 onPress={onClose}
462:                 variant="accent"
463:                 size="md"
464:                 className="w-full"
465:               />
466:             </View>
467:           </View>
468:         </Animated.View>
469:       </View>
470:     </Modal>
471:   );
472: }
473: 
474: // ─── Sub-components ──────────────────────────────────────────────────────────
475: 
476: /**
477:  * "Verified tutors only" switch in the filters sheet. Replaces the
478:  * previous class-swap (`bg-verification` vs `bg-border` + `marginLeft`
479:  * 22 vs 2) with a spring-sliding thumb and a smoothly interpolated
480:  * track color (border grey → verification green).
481:  *
482:  * Track 44×24, thumb 20×20, travel 24px — the inner 2px padding on
483:  * each side of the track stays implicit (the thumb starts at left-0
484:  * with a 2px track margin from the original `marginLeft: 2`).
485:  */
486: function FiltersVerifiedSwitch({ checked }: { checked: boolean }) {
487:   const TRACK_OFF = colors.border.strong ?? "#C8C0AE";
488:   const TRACK_ON = colors.brand.verification;
489:   const progress = useSharedValue(checked ? 1 : 0);
490: 
491:   useEffect(() => {
492:     progress.value = withTiming(checked ? 1 : 0, {
493:       duration: motion.duration.medium,
494:     });
495:   }, [checked, progress]);
496: 
497:   const trackStyle = useAnimatedStyle(() => {
498:     'worklet';
499:     return {
500:       backgroundColor: interpolateColor(
501:         progress.value,
502:         [0, 1],
503:         [TRACK_OFF, TRACK_ON],
504:       ),
505:     };
506:   });
507: 
508:   return (
509:     <View className="w-11 h-6 rounded-pill relative justify-center">
510:       <RAnimated.View
511:         style={[trackStyle, { position: "absolute", inset: 0, borderRadius: 999 }]}
512:       />
513:       <SwitchThumb
514:         checked={checked}
515:         trackWidth={44}
516:         thumbSize={20}
517:         thumbClassName="w-5 h-5 rounded-pill bg-surface"
518:         style={{
519:           marginLeft: 2,
520:           shadowColor: "#000",
521:           shadowOpacity: 0.15,
522:           shadowRadius: 2,
523:           shadowOffset: { width: 0, height: 1 },
524:           elevation: 2,
525:         }}
526:       />
527:     </View>
528:   );
529: }

(End of file - total 529 lines)
</content>
```

**Tool: bash**

**Input:**
```json
{
  "command": "sed -n '1,60p' src/hooks/useTutorClustering.ts; echo ===; grep -n \"supercluster\\|export function\\|cluster\" src/hooks/useTutorClustering.ts | head -20"
}
```

**Output:**
```
/**
 * @file useTutorClustering.ts
 * @description Hook to cluster tutor listings based on current map zoom and bounds using Supercluster.
 */
import { useMemo } from 'react';
import Supercluster from 'supercluster';
import { TutorListing } from '@/lib/tutor/firestoreTutorService';
import { MapBounds } from './useCameraBounds';

export type TutorClusterFeature =
  | {
      type: 'cluster';
      id: number;
      latitude: number;
      longitude: number;
      count: number;
      tutors: TutorListing[];
    }
  | {
      type: 'tutor';
      id: string;
      latitude: number;
      longitude: number;
      tutor: TutorListing;
    };

export function useTutorClustering(
  tutors: TutorListing[],
  zoom: number,
  bounds: MapBounds | null
): TutorClusterFeature[] {
  const supercluster = useMemo(() => {
    return new Supercluster({
      radius: 60,
      maxZoom: 16,
      minZoom: 1,
    });
  }, []);

  const features = useMemo(() => {
    const validTutors = tutors.filter((t) => t.coordinates != null);

    const points = validTutors.map((t) => ({
      type: 'Feature' as const,
      properties: {
        tutor: t,
      },
      geometry: {
        type: 'Point' as const,
        coordinates: [t.coordinates!.longitude, t.coordinates!.latitude],
      },
    }));

    supercluster.load(points);

    if (!bounds) return [];

    const bbox: [number, number, number, number] = [
      bounds.swLng,
      bounds.swLat,
===
3: * @description Hook to cluster tutor listings based on current map zoom and bounds using Supercluster.
6:import Supercluster from 'supercluster';
12:      type: 'cluster';
27:export function useTutorClustering(
32:  const supercluster = useMemo(() => {
33:    return new Supercluster({
54:    supercluster.load(points);
65:    const clusters = supercluster.getClusters(bbox, Math.round(zoom));
67:    return clusters.map((cluster): TutorClusterFeature => {
68:      if (cluster.properties.cluster) {
69:        // Extract leaves to get the actual tutors in this cluster
70:        const leaves = supercluster.getLeaves(cluster.id as number, Infinity);
71:        const clusterTutors = leaves.map((leaf) => leaf.properties.tutor);
74:          type: 'cluster' as const,
75:          id: cluster.id as number,
76:          latitude: cluster.geometry.coordinates[1],
77:          longitude: cluster.geometry.coordinates[0],
78:          count: cluster.properties.point_count as number,
79:          tutors: clusterTutors as TutorListing[],
86:        id: cluster.properties.tutor.uid,

```

---

## Assistant (Build · DeepSeek V4 Flash Free · 4.3s)

_Thinking:_

I now have enough for the audits. Let me also quickly check the markerIcons + avatarPins and TutorAvatarPin (for Phase 2 custom markers), and check the admin home + admin profile header, plus TutorBottomBar for tone pattern. And the `_layout.tsx` route list. Let me batch a few more reads.

**Tool: bash**

**Input:**
```json
{
  "command": "sed -n '1,60p' src/lib/map/markerIcons.ts; echo \"=== avatarPins head ===\"; sed -n '1,50p' src/lib/map/avatarPins.ts"
}
```

**Output:**
```
/**
 * markerIcons — Shared image refs for the custom map pins.
 *
 * expo-maps Google markers accept a `SharedRef<'image'>` as their
 * `icon`; expo-image's `Image.loadAsync` produces exactly that. The
 * three pins (generated by `scripts/generate-markers.mjs`) are loaded
 * once and cached module-wide:
 *
 *   - pin-tutor.png    amber badge + slate dot  → regular tutor
 *   - pin-verified.png green badge + white dot  → verified tutor
 *   - pin-cluster.png  slate badge + amber dot  → zoom-in cluster
 *
 * The tail tip sits at the image bottom-center, which matches expo-maps'
 * default marker anchor.
 */
import { Image, type ImageRef } from "expo-image";

export type MarkerIconSet = {
  tutor: ImageRef | null;
  verified: ImageRef | null;
  cluster: ImageRef | null;
};

const PIN_ASSETS = {
  tutor: require("../../../assets/markers/pin-tutor.png"),
  verified: require("../../../assets/markers/pin-verified.png"),
  cluster: require("../../../assets/markers/pin-cluster.png"),
} as const;

let cache: MarkerIconSet | null = null;
let inflight: Promise<MarkerIconSet> | null = null;

/** Returns the three pin refs. Subsequent calls return the cached set. */
export function loadMarkerIcons(): Promise<MarkerIconSet> {
  if (cache) return Promise.resolve(cache);
  if (!inflight) {
    inflight = Promise.all([
      Image.loadAsync(PIN_ASSETS.tutor),
      Image.loadAsync(PIN_ASSETS.verified),
      Image.loadAsync(PIN_ASSETS.cluster),
    ])
      .then(([tutor, verified, cluster]) => {
        cache = { tutor, verified, cluster };
        return cache;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}=== avatarPins head ===
sed: can't read src/lib/map/avatarPins.ts: No such file or directory

```

**Tool: bash**

**Input:**
```json
{
  "command": "grep -n \"notifications\\|/notification\\|bell\\|Ionicons\" src/screens/admin/AdminHome.tsx | head -10; echo \"=== admin home header ===\"; grep -n \"ScreenHeader\\|text-screen-title\\|flex-row\" src/screens/admin/AdminHome.tsx | head -8; echo ===; grep -rn \"route\\|title\" .expo/types/router.d.ts 2>/dev/null | grep -o \"href.*\" | sort -u | head -40"
}
```

**Output:**
```
1:import { Ionicons } from "@expo/vector-icons";
113:      icon: "analytics" as keyof typeof Ionicons.glyphMap,
127:      icon: "shield-checkmark" as keyof typeof Ionicons.glyphMap,
142:      icon: "people" as keyof typeof Ionicons.glyphMap,
193:              <Ionicons name={section.icon} size={24} className={section.color} />
220:            <Ionicons name="chevron-forward" size={20} color="#6B7268" />
=== admin home header ===
13:  ScreenHeader,
164:      <ScreenHeader>
168:            className="text-screen-title font-medium text-white"
177:      </ScreenHeader>
184:            className="bg-surface border border-border rounded-card p-4 flex-row items-center gap-4 mb-4 active:opacity-80"
196:              <View className="flex-row items-center gap-2">
===

```

---

## Assistant (Build · DeepSeek V4 Flash Free · 4.6s)

**Tool: bash**

**Input:**
```json
{
  "command": "find src/lib/map src/hooks -name \"*.ts\" -o -name \"*.tsx\" | head; echo ===; grep -rn \"export function useAvatarPins\\|avatarPinKey\" src/lib/map/*.ts* 2>/dev/null | head"
}
```

**Output:**
```
src/lib/map/avatarPins.tsx
src/lib/map/markerIcons.ts
src/hooks/useAiChat.ts
src/hooks/useCameraBounds.ts
src/hooks/useFieldScroll.ts
src/hooks/useTutorClustering.ts
src/hooks/useUserLocation.ts
===
src/lib/map/avatarPins.tsx:39:export function avatarPinKey(
src/lib/map/avatarPins.tsx:65:  const key = avatarPinKey(avatarUri, verified);
src/lib/map/avatarPins.tsx:170: *   `avatarPinKey(...)` → image ref (or `null` when that pin failed),
src/lib/map/avatarPins.tsx:179:export function useAvatarPins(
src/lib/map/avatarPins.tsx:195:      const key = avatarPinKey(t.photoUrl, t.isVerifiedProfessional);
src/lib/map/avatarPins.tsx:207:      const key = avatarPinKey(t.photoUrl, t.isVerifiedProfessional);
src/lib/map/avatarPins.tsx:234:        const key = avatarPinKey(t.photoUrl, t.isVerifiedProfessional);

```

---

## Assistant (Build · DeepSeek V4 Flash Free · 3.8s)

_Thinking:_

I now have a comprehensive picture. Let me also verify the admin home bell absence and the `TutorBottomBar` tone pattern (as the reference for the student side), and check `_layout.tsx` routes for notification. Then I'll write the three audits and start implementing.

Let me quickly check the AdminHome header (lines 160-200) and check TutorBottomBar for its tone system.

**Tool: bash**

**Input:**
```json
{
  "command": "sed -n '160,200p' src/screens/admin/AdminHome.tsx; echo \"=== TutorBottomBar tone ===\"; grep -n \"tone\\|dark\\|glass\" src/components/domain/TutorBottomBar.tsx | head -15"
}
```

**Output:**
```

      {/* Hero header — mirrors StudentHome.tsx's "Good morning, {name}"
          pattern. The right-hand slot is intentionally empty; profile
          is reachable from the bottom nav. */}
      <ScreenHeader>
        <View>
          <Text className="text-body text-white/70 mb-0.5">Dashboard</Text>
          <Text
            className="text-screen-title font-medium text-white"
            numberOfLines={1}
          >
            {displayName}
          </Text>
          <Text className="text-caption text-white/70 mt-1">
            Manage platform, verifications & users
          </Text>
        </View>
      </ScreenHeader>

      <ScreenScroll>
        {sections.map((section) => (
          <Pressable
            key={section.route}
            onPress={() => router.push(section.route as any)}
            className="bg-surface border border-border rounded-card p-4 flex-row items-center gap-4 mb-4 active:opacity-80"
            accessibilityRole="button"
            accessibilityLabel={
              section.count
                ? `${section.title}, ${section.countLabel}`
                : section.title
            }
          >
            <View className={`w-12 h-12 rounded-pill items-center justify-center ${section.bgClass}`}>
              <Ionicons name={section.icon} size={24} className={section.color} />
            </View>
            <View className="flex-1 min-w-0">
              <View className="flex-row items-center gap-2">
                <Text className="text-card-title font-medium text-text-primary">
                  {section.title}
                </Text>
                {section.count !== null ? (
=== TutorBottomBar tone ===
48:   * Visual tone:
50:   *   - `dark`: floating glass dock (premium UI pass) for the dark
53:  tone?: "light" | "dark";
62:  tone = "light",
85:  const accentColor = tone === "dark" ? "#E5A03B" : ACTIVE_COLOR;
87:  if (tone === "dark") {
90:        {/* Floating glass dock (premium UI pass). Translucent white
96:          className="relative flex-row rounded-3xl bg-glass border border-glass-border px-1 py-0.5 shadow-[0_10px_30px_rgba(0,0,0,0.45)]"
120:              tone="dark"
180:  tone = "light",
185:  tone?: "light" | "dark";
190:    ? tone === "dark"
193:    : tone === "dark"
213:            ? tone === "dark"

```

---

## Assistant (Build · DeepSeek V4 Flash Free · 39.4s)

_Thinking:_

I now have a comprehensive audit picture. Let me write the three audits, then implement.

**PHASE 1 AUDIT (UI consistency):**

1. **1.1 Bottom nav on student Home** — Current state: `BottomNav` already has the full two-tone system (light bar + dark floating glass dock). StudentHome passes `tone="dark"`. The dark branch renders a full 5-tab glass dock with amber active dot. **No collapsed-pill code path exists** in the current working tree. The reporter's screenshot likely predates the dark-dock work (BottomNav.tsx is uncommitted-modified). Verdict: already fixed in working tree; flag for on-device confirmation. No code change needed unless I find a bug. Hmm — but wait. The mission says "Unless the reporter is wrong — verify on device/screenshot — the fix below is a complete rewrite". Since I can't run the device, I should carefully review the dark dock rendering for anything that could produce a "single collapsed pill with just a house icon". 

   Looking at the dark TabRow: `{tone === "light" && width > 0 ? <Animated.View/> : null}` — the pill is only for light. Tabs render. Nothing collapses. UNLESS `bg-glass` on the dock renders nearly invisible (rgba 0.06 white on night) — the dock could appear as a nearly-invisible bar with only the white icons visible... but all 5 icons would show. The screenshot description says "just a house icon" — that matches the LIGHT bar rendering (white bg-surface bar) on a dark screen where the green pill surrounds only the active Home tab... no, the other 4 tabs would still show.

   Hmm, actually — wait. If `tone` were somehow not "dark" (e.g., an older build of StudentHome without `tone="dark"`), the light bar would render: `bg-surface` white strip with 5 tabs. That's not "a single collapsed pill" either.

   I'll flag 1.1 as: two-tone nav already implemented + verified the render path; no code change; request on-device confirm. If the reporter still sees the collapsed pill, it's a stale build.

   Hmm, but the mission explicitly lists it as a to-fix item with screenshots. The safest: since the working tree already has the full implementation AND the mission says "verify, don't trust the report", I'll keep 1.1 as "verified already fixed" in the audit, no change. Actually — let me reconsider. Maybe the screenshots show something I can still fix: the mission item 1.2 says the CTA is "ghosted near-transparent white-on-navy" but the code shows `bg-amber` solid. 1.4 says the badge clips but code shows inline checkmark. These suggest the mission brief was written against an EARLIER build than the working tree. The working tree already contains the fixes (uncommitted, prior session). So Phase 1 is largely "verify + flag", not "fix".

   BUT — there IS one real 1.4 finding: the **CompactCard has NO verified badge at all**, and the mission says "compact shows no badge" as part of the inconsistency. Adding a compact verified badge = a real gap I can fix. Also the WideCard badge uses `-ml-0.5` inline (not clipping) — fine.

   And 1.3 seam: StudentHome is fully dark (no seam). MapSearch: dark hero + light map area with a hard seam. The mission's screenshot 3 mentions "dark hero just ends and light content begins — hard seam". MapSearch has exactly that. But is the seam "wrong" there? The map area is a native map (light tiles) — a rounded-top sheet overlapping the dark hero doesn't apply well to a full-bleed map. Actually the mission says "the premium screens solve this with rounded-top sheets". Which screens have a dark hero + light content seam? Enrollment, AIChat, StudentProfile, MapSearch. Let me check how AIChat handles it — AIChat body is `bg-background`? The mission says "the same hard seam exists on Home + Enrollments". Home is fully dark (no seam). Enrollments — let me check its layout: it uses ScreenLayout variant? Let me check quickly.

   Actually — given the mission text says seam is on "Home and Enrollments", but Home is fully dark... the mission brief is stale. I need to verify what the CURRENT app actually looks like and fix what's real.

   Let me check Enrollment's layout variant.

2. **1.5 Enrollment tabs** — Already has a sliding ActivePill with bg-primary fill + black text. Already satisfies "clear indicator". No change needed. (The mission brief wanted confirmation of a clear indicator — ✓ confirmed.)

3. **1.6 Bell** — StudentProfile has a mock-badge notification row (hardcoded "3 unread"). Mission says flag only — no fix. ✓ flag. Also no bell in dashboards (Phase 3 fixes).

So Phase 1 real work: 
- (1.4) Add verified badge to CompactCard (real inconsistency).
- (1.3) Check Enrollment seam; fix if hard seam exists.
- Verify 1.1/1.2/1.5 as already implemented.
- Flag 1.6.

Let me check Enrollment layout + AIChat layout to assess the seam properly.

**PHASE 2 AUDIT (map):**
- The map is expo-maps (NOT react-native-maps as the brief assumed). Android = GoogleMaps.View, iOS = AppleMaps.View.
- 2.1 POI clutter: 
  - iOS: `properties.pointsOfInterest = { including: [] }` hides ALL POIs. Supported ✓.
  - Android: NO `isPointsOfInterestEnabled` prop; BUT `properties.mapStyleOptions = { json }` IS supported natively (Records.kt parses `MapStyleOptions(json)` directly — no mapId needed). So a POI-stripping style JSON works on Android. I'll add a small POI-hiding style JSON constant. This matches the mission's intended fix (local style JSON zeroing POIs) — just via the expo-maps API instead of react-native-maps' customMapStyle.
- 2.2 Custom markers: already implemented (avatar teardrop pins + verified variant + cluster pins, per-type PNG fallbacks). The mission wants a dedicated `TutorMapMarker` component with a hierarchy: verified = ring/fill + checkmark, unverified neutral, selected scales + white border, selected draws translucent Circle radius. Current state: pins are rendered inline in MapSearch (`markers` array). Selected state: there's NO selected-radius circle currently (MapCircle type exists in TutorMap but MapSearch doesn't pass circles). The mission says "selected pin draws a translucent service-radius Circle under it". Currently no selection circle. Also no selected scaling.
  - Given expo-maps markers are image-based (ImageRef), "scaling" of a selected pin = swap to a bigger/white-ringed icon variant or overlay. We can implement: when a tutor is selected, render a `MapCircle` under the pin with the tutor's service radius (need radius data — TutorListing has coordinates; radius could be a fixed 3km default or derived). Hmm — is there radius data in the listing? The mission says "service radius (default 2.5 km when unset)". So implement `MapCircle` with radius 2500m, fill accentSoft (rgba amber low opacity), on Android. iOS expo-maps: does AppleMaps.View support circles? Let me check AppleMaps types. If yes, wire both.
  - TutorMapMarker component: create a small component that converts a tutor → TutorMarker + (selected ? circle). It's mostly presentational config. I'll create `src/components/map/TutorMapMarker.tsx`? Actually markers are passed as plain objects to the native view, so a "component" doesn't fit expo-maps' API. The honest adaptation: a pure function/selector `toTutorMarker(tutor, opts)` in a new `src/lib/map/tutorMarkers.ts` + the selected-circle wiring in MapSearch. I'll document the deviation from the brief (react-native-maps children markers don't exist in expo-maps).
  - Wait — what about "selected scales + white border"? With image pins, we can generate an extra "selected" variant pin (white ring) via the marker generator script. Let me check the generator script and PNG assets. Actually — adding a selected-pin PNG (white-ringed version of the tutor pin) is feasible: scripts/generate-markers.mjs. Let me check it.
- 2.3 Bottom sheet parity: TutorPreviewSheet already uses Avatar + verified pill + subjects + rate + rating + CTA — very close to TutorCard compact. The mission wants the sheet to reuse the compact TutorCard. The current sheet is bespoke but visually consistent. Given the sheet needs "View Profile" CTA + close, reusing CompactCard wholesale isn't right (CompactCard is 200px wide rail). I'll assess: the mission says "the sheet should render the same compact TutorCard used in the bottom sheet rows". Current NearbyTutorRow (in MapSearch) is a tiny dot+name+distance row — NOT a TutorCard. The mission's complaint: "the bottom sheet reimplements the tutor row rather than reusing the shared TutorCard". The bespoke `NearbyTutorRow` + sheet header differ from TutorCard styling. Fix: replace the "nearby tutors strip" rows with actual CompactCard instances (variant compact-h) OR at least make them share the verified badge language. CompactCard lacks a verified badge (my 1.4 fix) — after adding it, I can swap NearbyTutorRow → CompactCard.
  - Actually the cleanest: keep the nearby strip header, render `CompactCard` (compact-h) in a horizontal ScrollView for the nearby tutors, and keep the preview sheet as-is (it's already premium). Hmm, but the mission explicitly says the SHEET should reuse the TutorCard. Let me re-read: "Bottom sheet parity — the map's tutor preview sheet and the nearby-tutor bottom list should render the same compact TutorCard (variant compact-h) used by search results / home, not bespoke row layouts." So both the sheet content AND the nearby list should use CompactCard. The sheet already looks like a mini TutorCard (avatar+name+verified+subjects+rate+rating) — close enough, but to comply I'll render CompactCard inside the sheet? The sheet needs the close button and View Profile CTA, which CompactCard doesn't have. I'll do: sheet keeps its premium layout but I'll extract the "verified badge" and reuse; AND the nearby strip switches to horizontal CompactCards. That's the pragmatic interpretation. Actually — I'll keep the sheet as the premium surface (it already uses the verified pill; adding the compact card inside a sheet is awkward UX), and replace the NearbyTutorRow strip with CompactCard horizontal carousel. I'll document the decision.
- 2.4 Recenter FAB + filter wiring: Recenter FAB exists (handleRecenter, GPS). Filters: FiltersSheet is UI-only ("Show N results" just closes; doesn't filter the map). The mission wants filters to actually filter. This is real work: wire FiltersSheet state up to MapSearch → filter `tutors` by subjects/verified/distance/budget before clustering. I'll lift filter state into MapSearch, pass initial values + onChange to FiltersSheet, and filter the geo list.
- 2.5 Search/filter alignment: The search bar is `h-12 rounded-card` white surface, filter button is `w-12 h-12 rounded-xl bg-accent`. Mission wants "search pill + circular filter button, matched height, aligned with bottom nav radius tokens". So: make search `rounded-pill` (h-12), filter button `rounded-pill w-12 h-12` (same radius), consistent with `rounded-pill` used across the app. Minor styling fix.

**PHASE 3 AUDIT (notifications):**
- 3.1 Screen: `collection(db, "notifications", user.uid)` — **INVALID path** (even segments; RNFirebase throws "must point to a collection"). Same for writeNotification's `doc(collection(db, "notifications", recipientUid))` and markRead's `doc(db, "notifications", user.uid, row.id)`. Rules gate only the anchor doc `match /notifications/{uid}` — no subcollection rule. So the notification pipeline is broken end-to-end at the SDK level.
  - Fix: standardize on the anchor+subcollection pattern: `notifications/{uid}/inbox/{notificationId}`:
    - writeNotification → `doc(collection(db, "notifications", uid, "inbox"))`
    - Notification.tsx subscribe → `collection(db, "notifications", uid, "inbox")`
    - markRead → `doc(db, "notifications", uid, "inbox", rowId)`
    - userLifecycle purge → `collection(db, "notifications", uid, "inbox")` delete each + anchor doc delete (need to check userLifecycle line 138 context)
    - Rules: anchor `match /notifications/{uid}` (get/list signed-in; create only `_namespaceAnchor`; no update/delete) + `match /notifications/{uid}/inbox/{notificationId}` (create: signed-in && recipientUid==uid && type in [...]; update: owner only read/readAt diff; delete: admin).
  - Also the EnrollmentRepository writes enrollment_* notifications — let me check where those go (the grep found only a comment in FirebaseEnrollmentRepository.ts). Let me check if it writes notifications... grep showed only comments at lines 14-16. Let me verify whether enrollment acceptance actually writes a notification. If it does via writeNotification, the path fix covers it.
- 3.2 Bell + badge on 3 dashboards: student-home, tutor-home, admin-home. Add a shared `NotificationBell` component with live unread count (subscribe to `notifications/{uid}/inbox` where read==false). Route to /notification. Admin: notifications are per-user; admin's inbox would be empty unless the admin writes to themselves — the mission says "if the admin has no notifications, the bell hides". So the bell component: if uid null → render nothing. Place in the three headers (right side).
  - StudentHome header: greeting row currently has just the name block — add bell on the right.
  - TutorHome header: name block + verified pill — add bell right.
  - AdminHome header: right slot "intentionally empty" — add bell right.
- 3.3 Push: expo-notifications is NOT in package.json (grep found nothing). So push delivery would require adding a native dep → dev-client rebuild + FCM config → violates zero-budget (Cloud Functions on Firebase is Blaze/paid anyway). The mission says: "If you decide Expo's push service isn't sufficient, or Cloud Functions requires a paid plan, note the trade-off and wire the in-app layer fully, leaving a documented stub for the push hop." Per CLAUDE.md rule 6, Cloud Functions = paid = forbidden. And FCM/Expo push needs a server-side hop. The zero-budget path: **client-side push via Expo push API** is possible (fetch to exp.host from the client after writing a notification — but that only works when the recipient's app is running and requires the recipient's push token stored... and Expo push still needs expo-notifications native module for the token + permission). Since expo-notifications is NOT installed and adding it requires an EAS rebuild (out of scope today + needs the Android/iOS native module), the honest move: wire the in-app layer (bell, unread, center) fully and stub the push hop with a documented decision — no new native deps. That matches the mission's fallback. I'll document: "push delivery deferred; would require expo-notifications + a sender hop; Cloud Functions/FCM is paid-tier → not added. Stub: `src/services/notifications/push.ts` with `sendPushToUser()` that no-ops and logs, to be wired when a free sender exists."

Let me now check a few remaining things: Enrollment layout (seam), userLifecycle notifications purge context, FirebaseEnrollmentRepository notification writes, and the marker generator script. Then write audits + implement.

The audits are nearly complete. Let me verify the last details: Enrollment seam, userLifecycle purge, enrollment-repo notification writes, and the marker generator.

**Tool: bash**

**Input:**
```json
{
  "command": "grep -n \"ScreenLayout\\|variant=\\|ScreenScroll\\|bg-night\\|bg-background\" src/screens/student/Enrollment.tsx | head -8; echo \"=== userLifecycle purge ===\"; sed -n '125,150p' src/lib/admin/userLifecycle.ts; echo \"=== enrollment repo notification writes ===\"; grep -n \"writeNotification\\|enrollment_accepted\\|notification\" src/services/enrollments/FirebaseEnrollmentRepository.ts | head"
}
```

**Output:**
```
40:  ScreenLayout,
42:  ScreenScroll,
43:} from "@/components/shared/ScreenLayout";
234:    <ScreenLayout variant="background">
261:      <ScreenScroll>
326:      </ScreenScroll>
366:    </ScreenLayout>
=== userLifecycle purge ===
  const db = getFirestore(getApp());

  // Harvest verification-doc paths FIRST — the delete loop below
  // removes the very docs that carry them.
  const docPaths = await harvestDocPaths(uid);

  const firestoreRefs = [
    doc(db, "users", uid),
    doc(db, "users", uid, ...TUTOR_PROFILE_DOC.split("/")),
    doc(db, "users", uid, ...STUDENT_PROFILE_DOC.split("/")),
    doc(db, "tutors", uid),
    doc(db, "tutorVerifications", uid),
    doc(db, "tutorProfileUpdates", uid),
    doc(db, "notifications", uid),
  ];

  const firestoreDeleted: string[] = [];
  for (const ref of firestoreRefs) {
    try {
      await deleteDoc(ref);
      firestoreDeleted.push(ref.path);
    } catch {
      // A missing doc is a no-op; a rules denial surfaces in the
      // caller's summary. Keep going so one failure doesn't strand
      // half the purge.
    }
=== enrollment repo notification writes ===
14: * The notification side-effect (writing to `notifications/{uid}`) is
16: * standalone `notifications/{uid}` create rule allows any signed-in
19: * student-facing acceptance notifications without a Cloud Function
45:  writeNotification,
46:  notificationCopy,
47:} from "@/lib/verification/notifications";
244: * `enrollment_completed` notification.
249: * case is a duplicate notification, which the notification center
292:  // notification write throws — the enrollment is already expired.
295:      await writeNotification(

```

**Tool: bash**

**Input:**
```json
{
  "command": "ls scripts/; ls assets/markers/ 2>/dev/null; echo ===; grep -rn \"withPinCoordinates\" src/lib/location/nepalGeo.ts | head -3"
}
```

**Output:**
```
deleteUser.ts
fix_imports.ts
generate-markers.mjs
seedAdmin.ts
seedSupabaseTutors.ts
pin-cluster.png
pin-tutor.png
pin-verified.png
===
11: * Truth ladder used by `withPinCoordinates`:
120:export function withPinCoordinates<T extends PinResolvable>(

```

---

## Assistant (Build · DeepSeek V4 Flash Free · 3.8s)

_Thinking:_

Now I have a complete picture. Let me look at the generate-markers script briefly and the userLifecycle harvestDocPaths (does it purge subcollection docs?). Then I'll write the audits.

**Tool: bash**

**Input:**
```json
{
  "command": "sed -n '1,50p' scripts/generate-markers.mjs; echo \"=== harvestDocPaths ===\"; grep -n -A20 \"async function harvestDocPaths\" src/lib/admin/userLifecycle.ts | head -30"
}
```

**Output:**
```
#!/usr/bin/env node
/**
 * generate-markers.mjs — EdumentX custom map pin generator.
 *
 * Renders the Slate/Night + Amber themed tutor map pins as PNGs into
 * `assets/markers/`. Pure Node — no canvas or image deps: a minimal
 * PNG encoder (zlib + CRC32) writes RGBA output. Pixels are
 * supersampled `SS x SS` for antialiasing, then box-downsampled.
 *
 * The badge is a rounded-square locator with a stub tail; the map
 * anchor (bottom-center of the canvas) lands exactly on the tail tip,
 * matching expo-maps' default `bottom-center` marker anchor.
 *
 * Run:  node scripts/generate-markers.mjs
 */
import { Buffer } from "node:buffer";
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "assets",
  "markers",
);

const W = 64; // logical canvas width
const H = 84; // logical canvas height (tail tip at y=80 ≈ anchor+breathe)
const SS = 8; // supersample factor

const C = {
  amber: [229, 160, 59, 255],
  slate: [15, 23, 42, 255],
  green: [63, 138, 90, 255],
  white: [255, 255, 255, 255],
};

// ── Signed-distance helpers ──────────────────────────────────────────────────

const clamp01 = (v) => Math.min(1, Math.max(0, v));

function sdCircle(px, py, cx, cy, r) {
  return Math.hypot(px - cx, py - cy) - r;
}

function sdRoundRect(px, py, cx, cy, hw, hh, r) {
  const qx = Math.abs(px - cx) - (hw - r);
  const qy = Math.abs(py - cy) - (hh - r);
=== harvestDocPaths ===
83:async function harvestDocPaths(uid: string): Promise<string[]> {
84-  const db = getFirestore(getApp());
85-  const candidates = [
86-    doc(db, "users", uid, ...TUTOR_PROFILE_DOC.split("/")),
87-    doc(db, "tutorVerifications", uid),
88-    doc(db, "tutorProfileUpdates", uid),
89-  ];
90-
91-  const paths: string[] = [];
92-  for (const ref of candidates) {
93-    try {
94-      const snap = await getDoc(ref);
95-      const documents = snap.exists() ? snap.data().documents : undefined;
96-      if (!Array.isArray(documents)) continue;
97-      for (const entry of documents) {
98-        const p = entry?.path;
99-        if (typeof p === "string" && p.length > 0) paths.push(p);
100-      }
101-    } catch {
102-      // Missing doc or permission edge — skip this candidate rather
103-      // than aborting the whole purge.

```

---

## Assistant (Build · DeepSeek V4 Flash Free · 5.7s)

_Thinking:_

I now have everything I need for the audits. Let me write them concisely and start implementing.

One more check — the enrollment repo writeNotification at line 295 — it uses writeNotification so the path fix covers it. And userLifecycle deletes the anchor `doc(db, "notifications", uid)` — with the new pattern, we should also delete subcollection docs. I'll add a subcollection purge.

Also — I should double check the admin home header has no bell and check `Avatar.tsx` name/initials, and confirm `bg-ai-light`, `bg-accent-light`, `bg-onb-map`, `bg-verification-light` tokens exist in tailwind config (used by Notification.tsx TYPE_META). Let me check tailwind tokens quickly, then write the audit + start Phase 1.

**Tool: bash**

**Input:**
```json
{
  "command": "grep -n \"accent-light\\|verification-light\\|ai-light\\|onb-map\\|bg-sand\\|success-bg\\|warning-bg\\|danger-bg\\|warning-text\\|verification-dark\\|border-l-accent\" tailwind.config.js | head -20; echo ===; grep -rn \"notifications\\|/notification\" src/screens/admin/AdminProfile.tsx src/components/shared/*.tsx 2>/dev/null | head -5"
}
```

**Output:**
```
59:        'success-bg': '#DCF0E4',
61:        'warning-text': '#8B5E10',
62:        'warning-bg': '#FBEBCF',
65:        'danger-bg': '#F9E5E1',
93:        'onb-map': '#F0EBE0',
===

```

---

## Assistant (Build · DeepSeek V4 Flash Free · 3.8s)

**Tool: bash**

**Input:**
```json
{
  "command": "sed -n '30,120p' tailwind.config.js"
}
```

**Output:**
```
        'glass-strong': 'rgba(255, 255, 255, 0.10)',
        'glass-border': 'rgba(255, 255, 255, 0.14)',
        'glass-faint': 'rgba(255, 255, 255, 0.03)',

        // Brand
        primary: {
          DEFAULT: '#2F5D50',
          dark: '#254B41',
          light: '#F1ECE0',
        },
        accent: {
          DEFAULT: '#E5A03B',
          light: '#FBEBCF',
        },
        verification: {
          DEFAULT: '#3F8A5A',
          dark: '#2D6B44',
          light: '#DCF0E4',
        },
        ai: {
          DEFAULT: '#4A7FA5',
          dark: '#2D5F80',
          light: '#EBF3F9',
          border: '#B8D4E8',
        },

        // Semantic
        success: '#3F8A5A',
        'success-text': '#2D6B44',
        'success-bg': '#DCF0E4',
        warning: '#E5A03B',
        'warning-text': '#8B5E10',
        'warning-bg': '#FBEBCF',
        danger: '#C1503D',
        'danger-text': '#8B3628',
        'danger-bg': '#F9E5E1',

        // Backgrounds
        background: {
          DEFAULT: '#FBF8F2',
          surface: '#FFFFFF',
          admin: '#F6F3EC',
        },

        // Text
        text: {
          DEFAULT: '#0F172A',
          primary: '#0F172A',
          secondary: '#6B7280',
          tertiary: '#0F172A',
          muted: '#6B7280',
          inverse: '#FFFFFF',
          link: '#2F5D50',
        },

        // Border
        border: {
          DEFAULT: '#E7E1D3',
          strong: '#6B7280',
          subtle: 'rgba(15, 23, 42, 0.05)',
        },

        // Onboarding illustration backgrounds
        'onb-map': '#F0EBE0',
        'onb-ai': '#EBF3F9',
        'onb-verify': '#DCF0E4',

        // Splash
        splash: '#0F172A',
        'splash-text': '#FBF8F2',
        'splash-track': 'rgba(251, 248, 242, 0.20)',
      },
      fontSize: {
        // ── New semantic scale ────────────────────────────────────────────────
        'display':       ['28px', { lineHeight: '34px', fontWeight: '700' }],
        'heading':       ['20px', { lineHeight: '26px', fontWeight: '600' }],
        'body':          ['15px', { lineHeight: '22px', fontWeight: '400' }],
        'body-sm':       ['13px', { lineHeight: '19px', fontWeight: '400' }],
        'caption':       ['13px', { lineHeight: '18px', fontWeight: '500' }],
        'label':         ['12px', { lineHeight: '16px', fontWeight: '600', letterSpacing: '0.4px' }],
        'micro':         ['10px', { lineHeight: '13px', fontWeight: '500' }],

        // ── Legacy named sizes (kept for backward compat) ─────────────────────
        'hero':          ['28px', { lineHeight: '34px', fontWeight: '500' }],
        'screen-title':  ['22px', { lineHeight: '29px', fontWeight: '500' }],
        'section-title': ['15px', { lineHeight: '22px', fontWeight: '500' }],
        'card-title':    ['14px', { lineHeight: '20px', fontWeight: '500' }],
        'header-title':  ['26px', { lineHeight: '34px', fontWeight: '500' }],
        'stepper-value': ['22px', { lineHeight: '28px', fontWeight: '500' }],
        'splash-mark':   ['30px', { lineHeight: '36px', fontWeight: '600' }],
        'splash-wordmark':['34px', { lineHeight: '40px', fontWeight: '500' }],

```

---

## Assistant (Build · DeepSeek V4 Flash Free · 6.9s)

_Thinking:_

All tokens exist. Now I have the complete audit. Let me write it up concisely and start implementing Phase 1.

Let me also verify the `AIChat` header for a seam reference and check `bg-sand` exists (it's referenced in Notification.tsx and Enrollment) — I saw `'onb-map': '#F0EBE0'` at line 93 but no `sand`. Let me grep sand.

**Tool: bash**

**Input:**
```json
{
  "command": "grep -n \"sand\" tailwind.config.js; echo ===; grep -n \"bg-sand\\|text-sand\" src/screens/student/AIChat.tsx | head -3; echo ===; npx tsc --noEmit 2>&1 | tail -5"
}
```

**Output:**
```
23:        sand: '#F1ECE0',
===
240:          <View className="flex-1 bg-sand rounded-pill h-11 flex-row items-center px-4">
===

```

---

## Assistant (Build · DeepSeek V4 Flash Free · 8.2s)

_Thinking:_

`bg-sand` exists (F1ECE0). tsc baseline: let me run it. The command output got cut — the tsc ran but no output shown? Actually the `===` markers show tsc produced no output in the tail — meaning no errors (exit 0). Let me confirm the baseline explicitly and also run eslint baseline.

Now let me write the audit and begin Phase 1 implementation.

**AUDIT — Phase 1 (UI consistency):**

Files involved:
1. `src/components/shared/BottomNav.tsx` + `src/screens/student/StudentHome.tsx:359` — two-tone system ALREADY implemented (dark floating glass dock, amber active dot, 5 tabs). No code path renders a "collapsed single pill". Reporter's screenshot predates the current working tree (BottomNav.tsx is modified-uncommitted). Verdict: verify on device; no code change.
2. `src/screens/student/StudentHome.tsx:244-258` — CTA is solid `bg-amber` with `text-night` (dark text on amber) — high contrast. NOT ghosted. Verdict: already fixed; no change.
3. Seam: StudentHome is fully dark (no seam). MapSearch: dark hero → map (light) with a hard seam — but the body is a native map, so the "rounded sheet" pattern doesn't apply. Enrollment: `variant="background"` (light header + light body, no seam). Verdict: no hard seam on the screens the report names; MapSearch seam is inherent to a full-bleed map. No change (I'll note it).

   Hmm wait — actually let me double check Enrollment header: line 234 `ScreenLayout variant="background"`, line 261 `<ScreenScroll>` — so the header is... let me check what Enrollment's header looks like (does it use ScreenHeader dark? line ~236-260). Let me look.

4. Verified badge: WideCard inline checkmark (not clipped) ✓; CompactCard has NO badge ✗ — real inconsistency; TutorPreviewSheet has green pill ✓. Fix: add a verified badge to CompactCard (match WideCard's checkmark-circle).
5. Enrollment tabs: sliding ActivePill bg-primary + black text — clear indicator, matches light BottomNav's green pill language ✓. No change.
6. Bell: only StudentProfile has a notification row with a HARDCODED "3 unread" badge (mock). Flag only per mission.

Phase 1 changes: CompactCard verified badge. Everything else verified as already implemented or flag-only.

Let me check Enrollment's header block to complete the seam check.

**Tool: read**

**Input:**
```json
{
  "filePath": "/media/xlegion/Win/PROJECTS/EdumentX/src/screens/student/Enrollment.tsx",
  "limit": 40,
  "offset": 228
}
```

**Output:**
```
<path>/media/xlegion/Win/PROJECTS/EdumentX/src/screens/student/Enrollment.tsx</path>
<type>file</type>
<content>
228:       "Use the tutor's inbox → Accept in dev mode to mirror the production flow. The auto-sweep then moves the accepted enrollment to Past once endDate is past.",
229:     );
230:     void r;
231:   }
232: 
233:   return (
234:     <ScreenLayout variant="background">
235:       {/* Header — slate hero, same shape as StudentHome / MapSearch
236:           / AIChat. */}
237:       <ScreenHeader>
238:         <Text className="text-body text-white/70 mb-0.5">Your learning</Text>
239:         <View
240:           style={{
241:             borderBottomWidth: 2,
242:             borderBottomColor: "#E5A03B",
243:             paddingBottom: 2,
244:             alignSelf: "flex-start",
245:           }}
246:         >
247:           <Text className="text-screen-title font-medium text-white">
248:             My Enrollments
249:           </Text>
250:         </View>
251:         <Text className="text-caption text-white/70 mt-1">
252:           {activeList.length + pendingList.length + pastList.length} total
253:           enrollments
254:         </Text>
255:       </ScreenHeader>
256: 
257:       {/* Tabs */}
258:       <EnrollmentTabs active={tab} onChange={setTab} counts={counts} />
259: 
260:       {/* List */}
261:       <ScreenScroll>
262:         {!hasLoaded ? (
263:           // First-snapshot skeleton
264:           <View className="items-center justify-center pt-16 px-6">
265:             <Ionicons name="sync-outline" size={26} color="#6B7268" />
266:             <Text className="text-caption text-text-muted mt-2">
267:               Loading enrollments…

(Showing lines 228-267 of 843. Use offset=268 to continue.)
</content>
```

---

## Assistant (Build · DeepSeek V4 Flash Free · 9.5s)

_Thinking:_

Enrollment uses a dark ScreenHeader + light body (`variant="background"` + `ScreenScroll` on bg-background). There IS a hard seam between the dark hero and the light body — matching the mission's description "dark header just ends and light content begins — hard seam" (screenshot 3). The premium pattern: rounded-top light sheet overlapping the dark hero by 12-16px. But wait — the mission said the seam is on "Home + Enrollments". Home is fully dark. Enrollments has the seam (dark hero → light tabs/body).

The fix the mission wants: "the light content sheet overlaps the dark hero by 12-16px with a rounded top". Apply to Enrollment: make the tabs bar + body start with `rounded-t-3xl bg-background` (or surface) with negative top margin / overlapping the header.

How to do it cleanly: In Enrollment, wrap the tabs + scroll in a container with `rounded-t-3xl bg-background` (or surface) and `-mt-4` (16px overlap). Since ScreenHeader has `pb-8`, the seam is at the header bottom. Let me restructure:

```
<ScreenHeader>...</ScreenHeader>
<View className="bg-background rounded-t-3xl -mt-4 flex-1 overflow-hidden">
  <EnrollmentTabs ... />
  <ScreenScroll>...</ScreenScroll>
</View>
```

Wait — but the ScreenHeader is `bg-night` and the body `bg-background`. The rounded sheet with `-mt-4` will overlap the dark header by 16px — that's the premium pattern. The tabs bar is `bg-surface` with `border-b` — sitting on top of the rounded background sheet. Good.

Also the mission says "Apply the same treatment on Home" — Home is already fully dark (night-deep body), no seam exists. So only Enrollments needs it (and possibly MapSearch, but the map is a full-bleed native surface — the seam is the map itself, and the map area shouldn't be rounded — actually the map could also get the rounded-top treatment: `rounded-t-3xl overflow-hidden` on the map container + `-mt-4`... but a map with rounded top corners overlapping the dark hero would look premium. Hmm. But wait — the hero on MapSearch contains the search bar; the map below starts flat. Let me apply the same rounded-overlap to the map container in MapSearch. Actually the mission Phase 1 item 1.3 mentions "Home + Enrollments" only. MapSearch seam is part of Phase 2 restyle anyway. Let me do Enrollment now, and MapSearch during Phase 2 (since I'll be restyling the map controls there).

Also AIChat — does it have the seam? It's `variant` — let me not go overboard; the mission names Home + Enrollments. I'll fix Enrollment, and check AIChat quickly (if it has the same dark-hero→light-body seam, apply the same treatment for consistency). Let me check AIChat's layout.

Actually — the mission says "the same hard seam exists on Home + Enrollments (dark hero just ends and light content begins)". Since Home is fully dark now, only Enrollments remains. I'll do Enrollment + AIChat if it has the same pattern. Let me check.

**Tool: bash**

**Input:**
```json
{
  "command": "grep -n \"ScreenLayout\\|ScreenHeader\\|ScreenScroll\\|variant=\" src/screens/student/AIChat.tsx | head -8; echo ===; grep -n \"ScreenLayout\\|ScreenHeader\\|ScreenScroll\\|variant=\\|bg-night\" src/screens/student/TutorDetailsScreen.tsx | head -8"
}
```

**Output:**
```
3:  ScreenLayout,
4:  ScreenHeader,
5:  ScreenScroll,
6:} from "@/components/shared/ScreenLayout";
163:    <ScreenLayout variant="night">
164:      <ScreenHeader>
198:      </ScreenHeader>
205:        <ScreenScroll
===
33:import { ScreenLayout } from "@/components/shared/ScreenLayout";
313:      <ScreenLayout variant="background">
320:      </ScreenLayout>
327:      <ScreenLayout variant="background">
343:      </ScreenLayout>
348:    <ScreenLayout variant="background">
431:    </ScreenLayout>
1098:          <View className="w-full h-40 items-center justify-center relative overflow-hidden bg-night">

```

---

## Assistant (Build · DeepSeek V4 Flash Free · 3.7s)

_Thinking:_

AIChat uses `variant="night"` with ScreenScroll — check what className the scroll has (line 205). Let me look quickly, then finalize audits and implement.

**Tool: bash**

**Input:**
```json
{
  "command": "sed -n '196,230p' src/screens/student/AIChat.tsx"
}
```

**Output:**
```
          </View>
        </View>
      </ScreenHeader>

      <KeyboardAvoidingView
        behavior="padding"
        keyboardVerticalOffset={0}
        className="flex-1"
      >
        <ScreenScroll
          ref={scrollRef}
          className="flex-1 bg-background"
          contentContainerClassName="px-4 pt-6 pb-4"
          onContentSizeChange={scrollToBottom}
        >
          {activePills.length > 0 && (
            <ActivePillStrip
              pills={activePills}
              onRemove={handlePillRemove}
            />
          )}
          {displayMessages.map((m) => (
            <Bubble key={m.id} message={m} router={router} />
          ))}
          {isLoading && <ThinkingBubble />}
        </ScreenScroll>

        <View className="bg-surface border-t border-border px-4 pt-2 pb-3">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-2 pr-2"
        >
          {QUICK_CHIPS.map((chip) => (
            <QuickPromptChip

```

---

## Assistant (Build · DeepSeek V4 Flash Free · 18.6s)

_Thinking:_

AIChat has the same hard seam: dark ScreenHeader → `bg-background` scroll body, with no rounded overlap. So the seam pattern exists on AIChat, Enrollment, StudentProfile, MapSearch (all use dark hero + light body). The mission names "Home + Enrollments" but Home is now fully dark. To be consistent with the mission's intent ("hard seam between dark hero and light content on Home + Enrollments"), the fix should apply where the seam actually exists: Enrollment, AIChat, StudentProfile, MapSearch, Notification.

Hmm — but should I apply the rounded-overlap to ALL of them? The mission says: "the light body should overlap the dark hero by 12-16px with a rounded top". The cleanest approach: make it a SHARED pattern. Since `ScreenHeader` and `ScreenScroll` are shared primitives, I could add an optional overlap prop... but that risks scope creep. The mission explicitly names Home + Enrollments. Home has no seam. So: Enrollments (named), and for visual consistency I'll also apply it to AIChat + StudentProfile + Notification since they're identical structures (dark hero + light body). MapSearch gets it in Phase 2.

Actually — let me think about the right shared implementation. The ScreenScroll body is `px-6 pt-8 pb-12`. If I add a wrapper `rounded-t-3xl -mt-4` I need to restructure each screen. A simpler shared approach: add a `SheetBody` wrapper component in ScreenLayout.tsx:

```tsx
export function ScreenSheet({ children, className }: { children; className? }) {
  return <View className={`bg-background rounded-t-3xl -mt-4 flex-1 ${className ?? ""}`}>{children}</View>;
}
```

Hmm, but `-mt-4` (16px) needs the header to have extra bottom padding so content doesn't crowd. Header has pb-8 (32px); the 16px overlap leaves 16px of hero visible above the sheet — that's fine and matches the "12-16px" spec.

Wait — but there's a subtlety: `overflow-hidden` on the sheet wrapper would clip the Enrollment tabs' sliding pill shadows and the AIChat keyboard bar etc. The rounded corners clip at the top only; `overflow-hidden` is needed to make the rounded corners actually clip content (the tabs bar is bg-surface and would paint square corners over the rounded background). Actually — the tabs bar sits INSIDE the sheet (below the rounded edge), so no clipping issue at the corners themselves: the rounded sheet's corners would be visible only if content overlaps them. The tab bar's own corners are square but sit below the sheet's rounded boundary... hmm, no: the tab bar is the FIRST child inside the sheet. The sheet has `rounded-t-3xl` — the tab bar's top edge would be cut by the sheet's rounded corners ONLY if the sheet clips (`overflow-hidden`). Without clipping, the tab bar's square corners poke out over the rounded corners. So I should put `overflow-hidden` on the sheet wrapper.

For Enrollment: tabs bar is bg-surface; sheet bg-background → visible difference. Set the sheet to `bg-surface`? Enrollment tabs: the tab bar is `bg-surface border-b border-border`; body scroll is bg-background. If the sheet wrapper is `bg-background rounded-t-3xl -mt-4 flex-1 overflow-hidden`, the tab bar inside it shows a square top edge — but the sheet clips it at the rounded boundary. Since the tab bar is below the 16px rounded region, it's fine. But the tab bar's square top-left corner at x=0 will hit the rounded corner area... The rounded radius (24px) extends ~24px down from the sheet's top edge. The tab bar starts at the very top of the sheet (y=0). So the tab bar's top-left corner IS inside the rounded region → clipped by overflow-hidden → looks fine (the clip creates the rounded edge).

Hmm wait, but then the tab bar's bg-surface would be visible in the clipped region making the rounded corner look surface-colored instead of background-colored. That's fine visually — actually it's nicer to have the whole sheet be one surface. Let me make Enrollment's sheet wrapper `bg-surface` (matching the tabs bar) and the scroll stays bg-background below. Actually simpler: wrapper `bg-background`, tabs bar sits on top — the clipped corner shows the tab bar's surface color within the first 24px, then background below. Slight color mismatch at the very top curve. To be safe, wrapper = `bg-surface` for Enrollment? But then the ScrollView body (bg-background #FBF8F2) vs surface white — there'd be a color change mid-sheet. Currently: tabs bg-surface + body bg-background. Hmm — actually is the body of Enrollment `bg-background`? ScreenScroll without className → `flex-1` transparent → shows through to ScreenLayout bg-background (#FBF8F2). The tabs are white (#FFFFFF). So the sheet: white rounded top region (tabs) then cream body. With overflow-hidden clipping the tab bar at the rounded boundary → rounded white corners over the dark hero. That looks GOOD (premium sheet effect).

For AIChat: body is `bg-background`; the bottom input bar is bg-surface. Sheet wrapper `bg-background rounded-t-3xl -mt-4 flex-1 overflow-hidden` wrapping the KeyboardAvoidingView. 

For StudentProfile + Notification: same treatment.

OK — this is a clean, bounded change: add `ScreenSheet` (or just inline wrappers). I'll add a shared `ScreenSheet` primitive to ScreenLayout.tsx and use it in Enrollment, AIChat, StudentProfile, Notification, and MapSearch (in Phase 2). That keeps it DRY.

Hmm, wait. Let me reconsider scope. The mission 1.3 says: "dark→light seam... the light body should overlap the dark hero by 12-16px with a rounded top (rounded-t-3xl...)". It names Home + Enrollments. I'll apply to Enrollment (named) + AIChat + StudentProfile + Notification (identical structures — otherwise they're now inconsistent with Enrollment, which is the exact "consistency pass" goal). MapSearch gets it in Phase 2 during the map restyle.

Also — one concern: `overflow-hidden` + `-mt-4` on a flex-1 wrapper containing a ScrollView works fine (ScrollView inside a clipped container scrolls normally).

Let me also double check StudentProfile's structure (ScreenLayout variant + ScreenHeader + ScreenScroll).

Let me now write the audits and start implementing. First the Phase 1 audit writeup, then code.

Phase 1 implementation list:
1. `TutorCard.tsx` CompactCard: add verified badge (checkmark-circle) next to name — matches WideCard.
2. `ScreenLayout.tsx`: add `ScreenSheet` primitive.
3. `Enrollment.tsx`: wrap tabs+scroll in ScreenSheet.
4. `AIChat.tsx`: wrap KeyboardAvoidingView in ScreenSheet.
5. `StudentProfile.tsx`: wrap in ScreenSheet.
6. `Notification.tsx`: wrap in ScreenSheet (tabs bar is bg-surface; body scroll bg-background — the tabs bar is part of the light region; wrap tabs + list scroll in the sheet).
7. Flag: StudentProfile mock "3 unread" badge → flag only (mission says don't change the profile row).
8. Verify: BottomNav dark tone + CTA + Enrollment tabs already good → no change.

Let me look at StudentProfile's layout structure first.

**Tool: bash**

**Input:**
```json
{
  "command": "grep -n \"ScreenLayout\\|ScreenHeader\\|ScreenScroll\\|BottomNav\\|variant=\" src/screens/student/StudentProfile.tsx | head; echo ===; grep -n \"ScreenLayout\\|ScreenHeader\\|ScreenScroll\\|BottomNav\\|variant=\" src/screens/shared/Notification.tsx | head"
}
```

**Output:**
```
5:  ScreenLayout,
6:  ScreenHeader,
7:  ScreenScroll,
8:} from "@/components/shared/ScreenLayout";
29:import { BottomNav } from "@/components/shared/BottomNav";
223:    <ScreenLayout variant="background">
226:      <ScreenHeader>
233:      </ScreenHeader>
235:      <ScreenScroll>
394:      </ScreenScroll>
===
5:import { ScreenLayout } from "@/components/shared/ScreenLayout";
17:// NOTE: this file used to import `@/components/shared/ScreenHeader`
321:    <ScreenLayout variant="background">
323:          `<ScreenHeader>` and matches the slate-hero shape used by
412:    </ScreenLayout>

```

---

## Assistant (Build · DeepSeek V4 Flash Free · 12.8s)

_Thinking:_

All confirmed. Now let me write the audits and start implementing. Let me create the todo list for the three phases, then implement Phase 1.

Audit complete. Here are the findings, then implementation.

---

## Audit (read-only, before code)

**Phase 1 — UI consistency**
- **1.1 Bottom nav (Home):** `BottomNav.tsx` already has the full two-tone system (light bar / dark floating glass dock); `StudentHome.tsx:359` passes `tone="dark"`. No code path can render a "collapsed single pill" — the report predates the current (uncommitted) working tree. → verify on device, no code change.
- **1.2 CTA:** `StudentHome.tsx:249` is solid `bg-amber` with dark text — high contrast, not ghosted. → already fixed, no change.
- **1.3 Seam:** Home is fully dark (no seam). The real seam exists on Enrollments/AIChat/StudentProfile/Notification: dark hero → light body, hard edge. → add a shared rounded-overlap sheet.
- **1.4 Badge:** WideCard inline checkmark is fine; **CompactCard has NO verified badge** (real gap); TutorPreviewSheet has its own pill. → add badge to CompactCard.
- **1.5 Enrollment tabs:** already a sliding `ActivePill` (bg-primary + black text) — clear indicator. → no change.
- **1.6 Bell:** only StudentProfile has a row with a **hardcoded "3 unread"** mock badge (flag only — fix in Phase 3).

**Phase 2 — Map**
- Map stack is **expo-maps** (not react-native-maps as the brief assumed): `GoogleMaps.View` on Android, `AppleMaps.View` on iOS. Markers are image refs, not view children.
- **2.1 POIs:** Android: no POI toggle, **but `properties.mapStyleOptions.json` IS applied natively** (`Records.kt` → `MapStyleOptions(json)`, no mapId needed) → POI-stripping style JSON works. iOS: `pointsOfInterest: { including: [] }` hides all POIs (supported).
- **2.2 Markers:** avatar-drop pins + per-type PNG fallbacks already exist; **no selected-pin state, no service-radius circle** (though `MapCircle` type + Android circles prop are already supported in `TutorMap.tsx`).
- **2.3 Bottom sheet:** `TutorPreviewSheet` is bespoke but premium; the **nearby strip uses a tiny bespoke `NearbyTutorRow`** — swap to real `CompactCard` rows.
- **2.4 Filters:** `FiltersSheet` is **UI-only** — "Show N results" just closes; nothing filters the map. → lift filter state into MapSearch, actually filter.
- **2.5 Search/filter alignment:** search `rounded-card` + square filter button → align to pill radius + matched height.

**Phase 3 — Notifications**
- **3.1 CRITICAL:** the data path is broken at the SDK level. `collection(db, "notifications", uid)` is an **even-segment path** — RNFirebase throws *"must point to a collection"* (empirically verified via `FirestorePath`: 2 segments = document). Same for `writeNotification` (`doc(collection(...))` at `notifications.ts:71`) and `markRead` (`doc(db, "notifications", uid, row.id)`). Rules only gate the anchor `match /notifications/{uid}` — no subcollection rule. → restandardize on anchor `notifications/{uid}` + named subcollection `inbox/`, fix rules + all consumers.
- **3.2 No bell on any dashboard** (student-home, tutor-home, admin-home all lack one). → add shared `NotificationBell` with live unread count → `/notification`.
- **3.3 Push:** `expo-notifications` is **not installed**; Firebase Cloud Functions = Blaze (paid, violates zero-budget rule). → wire the in-app layer fully, add a documented push stub.

---

Now implementing Phase 1.

**Tool: todowrite**

**Input:**
```json
{
  "todos": [
    {
      "content": "Phase 1: rounded-overlap sheet primitive + apply to Enrollment/AIChat/StudentProfile/Notification",
      "status": "in_progress",
      "priority": "high"
    },
    {
      "content": "Phase 1: CompactCard verified badge (TutorCard.tsx)",
      "status": "pending",
      "priority": "high"
    },
    {
      "content": "Phase 1: tsc + eslint verification",
      "status": "pending",
      "priority": "high"
    },
    {
      "content": "Phase 2: POI stripping (Android style JSON + iOS POI exclude) in TutorMap",
      "status": "pending",
      "priority": "high"
    },
    {
      "content": "Phase 2: selected-pin state + service-radius circle on map",
      "status": "pending",
      "priority": "high"
    },
    {
      "content": "Phase 2: nearby strip → CompactCard rows; preview sheet parity",
      "status": "pending",
      "priority": "medium"
    },
    {
      "content": "Phase 2: FiltersSheet actually filters the map",
      "status": "pending",
      "priority": "high"
    },
    {
      "content": "Phase 2: search/filter pill alignment + map seam sheet",
      "status": "pending",
      "priority": "medium"
    },
    {
      "content": "Phase 2: tsc + eslint verification",
      "status": "pending",
      "priority": "high"
    },
    {
      "content": "Phase 3: restandardize notifications path to anchor+inbox subcollection (notifications.ts, Notification.tsx, userLifecycle, rules)",
      "status": "pending",
      "priority": "high"
    },
    {
      "content": "Phase 3: NotificationBell + unread badge on 3 dashboards",
      "status": "pending",
      "priority": "high"
    },
    {
      "content": "Phase 3: push stub + decision note",
      "status": "pending",
      "priority": "medium"
    },
    {
      "content": "Phase 3: tsc + eslint verification",
      "status": "pending",
      "priority": "high"
    },
    {
      "content": "Final report",
      "status": "pending",
      "priority": "medium"
    }
  ]
}
```

**Output:**
```
[
  {
    "content": "Phase 1: rounded-overlap sheet primitive + apply to Enrollment/AIChat/StudentProfile/Notification",
    "status": "in_progress",
    "priority": "high"
  },
  {
    "content": "Phase 1: CompactCard verified badge (TutorCard.tsx)",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "Phase 1: tsc + eslint verification",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "Phase 2: POI stripping (Android style JSON + iOS POI exclude) in TutorMap",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "Phase 2: selected-pin state + service-radius circle on map",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "Phase 2: nearby strip → CompactCard rows; preview sheet parity",
    "status": "pending",
    "priority": "medium"
  },
  {
    "content": "Phase 2: FiltersSheet actually filters the map",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "Phase 2: search/filter pill alignment + map seam sheet",
    "status": "pending",
    "priority": "medium"
  },
  {
    "content": "Phase 2: tsc + eslint verification",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "Phase 3: restandardize notifications path to anchor+inbox subcollection (notifications.ts, Notification.tsx, userLifecycle, rules)",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "Phase 3: NotificationBell + unread badge on 3 dashboards",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "Phase 3: push stub + decision note",
    "status": "pending",
    "priority": "medium"
  },
  {
    "content": "Phase 3: tsc + eslint verification",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "Final report",
    "status": "pending",
    "priority": "medium"
  }
]
```

---

## Assistant (Build · DeepSeek V4 Flash Free · 6.4s)

Phase 1 — first, the shared sheet primitive:

**Tool: edit**

**Input:**
```json
{
  "filePath": "/media/xlegion/Win/PROJECTS/EdumentX/src/components/shared/ScreenLayout.tsx",
  "oldString": "/**\n * Canonical scroll body. A `ScrollView` preconfigured with the\n * standard content spacing (`SCREEN_CONTENT_CLASSES`), no scroll\n * indicator, and `keyboardShouldPersistTaps=\"handled\"`.\n *\n * Override `contentContainerClassName` for the rare screen that needs\n * different body spacing (e.g. the AI chat's tighter bubble gutters).\n * `className` defaults to `flex-1`; pass `flex-1 bg-background` when\n * the body must sit on the light page color (common when the screen\n * variant is `night`).\n */",
  "newString": "/**\n * Light sheet body — the premium \"dark hero → light sheet\" seam.\n *\n * Screens with a dark (`bg-night`) hero and a light body used to have\n * a hard color edge where the hero ended. This wrapper is the shared\n * fix: the light content overlaps the dark hero by 16px (`-mt-4`)\n * with a `rounded-t-3xl` top, so the hero reads as a backdrop behind\n * a floating sheet instead of two stacked rectangles. `overflow-hidden`\n * makes the rounded corners actually clip the first child (tab bars,\n * cards, etc.).\n *\n * Structure:\n *\n *   <ScreenLayout variant=\"night\">\n *     <ScreenHeader>…dark hero…</ScreenHeader>\n *     <ScreenSheet>{…light content…}</ScreenSheet>\n *     <BottomNav />\n *   </ScreenLayout>\n */\nexport function ScreenSheet({\n  children,\n  className,\n}: {\n  children: ReactNode;\n  className?: string;\n}) {\n  return (\n    <View\n      className={`bg-background rounded-t-3xl -mt-4 flex-1 overflow-hidden ${className ?? \"\"}`}\n    >\n      {children}\n    </View>\n  );\n}\n\n/**\n * Canonical scroll body. A `ScrollView` preconfigured with the\n * standard content spacing (`SCREEN_CONTENT_CLASSES`), no scroll\n * indicator, and `keyboardShouldPersistTaps=\"handled\"`.\n *\n * Override `contentContainerClassName` for the rare screen that needs\n * different body spacing (e.g. the AI chat's tighter bubble gutters).\n * `className` defaults to `flex-1`; pass `flex-1 bg-background` when\n * the body must sit on the light page color (common when the screen\n * variant is `night`).\n */"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · DeepSeek V4 Flash Free · 3.9s)

Now apply the sheet to Enrollment:

**Tool: edit**

**Input:**
```json
{
  "filePath": "/media/xlegion/Win/PROJECTS/EdumentX/src/screens/student/Enrollment.tsx",
  "newString": "import {\n  ScreenLayout,\n  ScreenHeader,\n  ScreenScroll,\n  ScreenSheet,\n} from \"@/components/shared/ScreenLayout\";",
  "oldString": "import {\n  ScreenLayout,\n  ScreenHeader,\n  ScreenScroll,\n} from \"@/components/shared/ScreenLayout\";"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · DeepSeek V4 Flash Free · 3.4s)

**Tool: edit**

**Input:**
```json
{
  "filePath": "/media/xlegion/Win/PROJECTS/EdumentX/src/screens/student/Enrollment.tsx",
  "newString": "      {/* Tabs + list — light sheet overlapping the dark hero (premium\n          dark→light seam, shared `ScreenSheet` pattern) */}\n      <ScreenSheet>\n        <EnrollmentTabs active={tab} onChange={setTab} counts={counts} />",
  "oldString": "      {/* Tabs */}\n      <EnrollmentTabs active={tab} onChange={setTab} counts={counts} />"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · DeepSeek V4 Flash Free · 3.2s)

**Tool: read**

**Input:**
```json
{
  "filePath": "/media/xlegion/Win/PROJECTS/EdumentX/src/screens/student/Enrollment.tsx",
  "limit": 30,
  "offset": 355
}
```

**Output:**
```
<path>/media/xlegion/Win/PROJECTS/EdumentX/src/screens/student/Enrollment.tsx</path>
<type>file</type>
<content>
355:           still renders. */}
356:       <EditRequestSheet
357:         visible={editingRequest !== null}
358:         request={editingRequest}
359:         tutor={{
360:           name: editingRequest
361:             ? `Tutor ${editingRequest.tutorUid.slice(0, 6)}`
362:             : "",
363:           subjects: editingRequest?.subjects ?? [],
364:         }}
365:         onClose={() => setEditingRequest(null)}
366:         onSaved={() => setEditingRequest(null)}
367:         onRemoved={() => setEditingRequest(null)}
368:       />
369:     </ScreenLayout>
370:   );
371: }
372: 
373: /* ----------------------------- cards ----------------------------- */
374: 
375: /**
376:  * Pending-tab card — the student is waiting on the tutor's decision.
377:  * Tapping the card body navigates to the tutor's profile. Below
378:  * the read-only summary, two action buttons let the student edit
379:  * the request (schedule / dates / message) or remove it entirely
380:  * without waiting for the tutor's decision.
381:  */
382: function RequestCard({
383:   request,
384:   onPress,

(Showing lines 355-384 of 846. Use offset=385 to continue.)
</content>
```

---

## Assistant (Build · DeepSeek V4 Flash Free · 4.3s)

_Thinking:_

I need to close the ScreenSheet wrapper before `</ScreenLayout>`. Let me find where the ScreenScroll closes (line ~326 in the original, now shifted +2). Let me look at lines 325-370.

**Tool: read**

**Input:**
```json
{
  "filePath": "/media/xlegion/Win/PROJECTS/EdumentX/src/screens/student/Enrollment.tsx",
  "limit": 35,
  "offset": 322
}
```

**Output:**
```
<path>/media/xlegion/Win/PROJECTS/EdumentX/src/screens/student/Enrollment.tsx</path>
<type>file</type>
<content>
322:                       tutorName: e.studentName || `Tutor ${e.tutorUid.slice(0, 4)}`,
323:                     })
324:                   }
325:                 />
326:               ))}
327:           </View>
328:         )}
329:       </ScreenScroll>
330: 
331:       <BottomNav role="student" current="/enrollment" />
332: 
333:       {/* Rate & Review modal — surfaced from any card's
334:           "Rate & Review" CTA on the Active or Past tab. */}
335:       {reviewModalFor ? (
336:         <ReviewModal
337:           visible
338:           tutorUid={reviewModalFor.tutorUid}
339:           tutorName={reviewModalFor.tutorName}
340:           onClose={() => setReviewModalFor(null)}
341:           onSubmitted={() => {
342:             setReviewModalFor(null);
343:             Alert.alert(
344:               "Thanks for your review",
345:               "Your rating helps other students find the right tutor.",
346:             );
347:           }}
348:         />
349:       ) : null}
350: 
351:       {/* Edit / remove a pending request. The sheet resolves the
352:           tutor's name + subjects from the live `enrollments` /
353:           `requests` stream; if we don't have that context yet we
354:           fall back to a trimmed version of the uid so the sheet
355:           still renders. */}
356:       <EditRequestSheet

(Showing lines 322-356 of 846. Use offset=357 to continue.)
</content>
```

---

## Assistant (Build · DeepSeek V4 Flash Free · 3.8s)

**Tool: edit**

**Input:**
```json
{
  "filePath": "/media/xlegion/Win/PROJECTS/EdumentX/src/screens/student/Enrollment.tsx",
  "newString": "        )}\n      </ScreenScroll>\n      </ScreenSheet>\n\n      <BottomNav role=\"student\" current=\"/enrollment\" />",
  "oldString": "        )}\n      </ScreenScroll>\n\n      <BottomNav role=\"student\" current=\"/enrollment\" />"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · DeepSeek V4 Flash Free · 3.5s)

Now AIChat:

**Tool: edit**

**Input:**
```json
{
  "filePath": "/media/xlegion/Win/PROJECTS/EdumentX/src/screens/student/AIChat.tsx",
  "newString": "import {\n  ScreenLayout,\n  ScreenHeader,\n  ScreenScroll,\n  ScreenSheet,\n} from \"@/components/shared/ScreenLayout\";",
  "oldString": "import {\n  ScreenLayout,\n  ScreenHeader,\n  ScreenScroll,\n} from \"@/components/shared/ScreenLayout\";"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · DeepSeek V4 Flash Free · 3.8s)

**Tool: read**

**Input:**
```json
{
  "filePath": "/media/xlegion/Win/PROJECTS/EdumentX/src/screens/student/AIChat.tsx",
  "limit": 30,
  "offset": 198
}
```

**Output:**
```
<path>/media/xlegion/Win/PROJECTS/EdumentX/src/screens/student/AIChat.tsx</path>
<type>file</type>
<content>
198:         </View>
199:       </ScreenHeader>
200: 
201:       <KeyboardAvoidingView
202:         behavior="padding"
203:         keyboardVerticalOffset={0}
204:         className="flex-1"
205:       >
206:         <ScreenScroll
207:           ref={scrollRef}
208:           className="flex-1 bg-background"
209:           contentContainerClassName="px-4 pt-6 pb-4"
210:           onContentSizeChange={scrollToBottom}
211:         >
212:           {activePills.length > 0 && (
213:             <ActivePillStrip
214:               pills={activePills}
215:               onRemove={handlePillRemove}
216:             />
217:           )}
218:           {displayMessages.map((m) => (
219:             <Bubble key={m.id} message={m} router={router} />
220:           ))}
221:           {isLoading && <ThinkingBubble />}
222:         </ScreenScroll>
223: 
224:         <View className="bg-surface border-t border-border px-4 pt-2 pb-3">
225:         <ScrollView
226:           horizontal
227:           showsHorizontalScrollIndicator={false}

(Showing lines 198-227 of 492. Use offset=228 to continue.)
</content>
```

---

## Assistant (Build · DeepSeek V4 Flash Free · 4.7s)

**Tool: edit**

**Input:**
```json
{
  "filePath": "/media/xlegion/Win/PROJECTS/EdumentX/src/screens/student/AIChat.tsx",
  "newString": "      {/* Chat + input bar — light sheet overlapping the dark hero\n          (premium dark→light seam, shared `ScreenSheet` pattern) */}\n      <ScreenSheet>\n      <KeyboardAvoidingView\n        behavior=\"padding\"\n        keyboardVerticalOffset={0}\n        className=\"flex-1\"\n      >",
  "oldString": "      <KeyboardAvoidingView\n        behavior=\"padding\"\n        keyboardVerticalOffset={0}\n        className=\"flex-1\"\n      >"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · DeepSeek V4 Flash Free · 3.9s)

**Tool: read**

**Input:**
```json
{
  "filePath": "/media/xlegion/Win/PROJECTS/EdumentX/src/screens/student/AIChat.tsx",
  "limit": 40,
  "offset": 228
}
```

**Output:**
```
<path>/media/xlegion/Win/PROJECTS/EdumentX/src/screens/student/AIChat.tsx</path>
<type>file</type>
<content>
228:         <ScrollView
229:           horizontal
230:           showsHorizontalScrollIndicator={false}
231:           contentContainerClassName="gap-2 pr-2"
232:         >
233:           {QUICK_CHIPS.map((chip) => (
234:             <QuickPromptChip
235:               key={chip.id}
236:               preset={chip}
237:               onPress={() => handleChipTap(chip)}
238:               disabled={isLoading}
239:             />
240:           ))}
241:         </ScrollView>
242: 
243:         <View className="flex-row items-center gap-2 mt-2">
244:           <View className="flex-1 bg-sand rounded-pill h-11 flex-row items-center px-4">
245:             <TextInput
246:               value={input}
247:               onChangeText={setInput}
248:               placeholder="Ask about tutors, subjects, rates"
249:               placeholderTextColor="#6B7280"
250:               onSubmitEditing={() => handleSend(input)}
251:               editable={!isLoading}
252:               returnKeyType="send"
253:               className="flex-1 text-body-lg text-text-primary"
254:             />
255:           </View>
256:           <ChatSendButton
257:             enabled={!!input.trim() && !isLoading}
258:             onPress={() => handleSend(input)}
259:           />
260:         </View>
261:       </View>
262: 
263:       </KeyboardAvoidingView>
264: 
265:       <BottomNav role="student" current="/AI-chat" />
266:     </ScreenLayout>
267:   );

(Showing lines 228-267 of 495. Use offset=268 to continue.)
</content>
```

---

## Assistant (Build · DeepSeek V4 Flash Free · 4.8s)

**Tool: edit**

**Input:**
```json
{
  "filePath": "/media/xlegion/Win/PROJECTS/EdumentX/src/screens/student/AIChat.tsx",
  "newString": "      </KeyboardAvoidingView>\n      </ScreenSheet>\n\n      <BottomNav role=\"student\" current=\"/AI-chat\" />",
  "oldString": "      </KeyboardAvoidingView>\n\n      <BottomNav role=\"student\" current=\"/AI-chat\" />"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · DeepSeek V4 Flash Free · 4.6s)

_Thinking:_

Now StudentProfile — wrap the ScreenScroll in the sheet. Let me look at the exact region (lines 223-235 and 394).

Now StudentProfile:

**Tool: read**

**Input:**
```json
{
  "filePath": "/media/xlegion/Win/PROJECTS/EdumentX/src/screens/student/StudentProfile.tsx",
  "limit": 30,
  "offset": 220
}
```

**Output:**
```
<path>/media/xlegion/Win/PROJECTS/EdumentX/src/screens/student/StudentProfile.tsx</path>
<type>file</type>
<content>
220:   }
221: 
222:   return (
223:     <ScreenLayout variant="background">
224: 
225:       {/* Hero header — slate, matches the other 4 student surfaces. */}
226:       <ScreenHeader>
227:         <Text className="text-body text-white/70 mb-0.5">Profile</Text>
228:         <View style={{ borderBottomWidth: 2, borderBottomColor: '#E5A03B', paddingBottom: 2, alignSelf: 'flex-start' }}>
229:           <Text className="text-display text-white">
230:             Your account
231:           </Text>
232:         </View>
233:       </ScreenHeader>
234: 
235:       <ScreenScroll>
236:         {/* Identity card */}
237:         <View className="bg-surface border border-border rounded-card p-5 items-center">
238:           <AvatarBubble
239:             name={name || user?.email || "Student"}
240:             uri={avatarUri}
241:             editable={!uploadingPhoto}
242:             onPress={pickImage}
243:           />
244:           <Text className="text-section-title font-medium text-text-primary mt-3">
245:             {name || "Add your name"}
246:           </Text>
247:           {user?.email && (
248:             <View className="flex-row items-center gap-1.5 mt-1">
249:               <Ionicons name="mail-outline" size={12} color="#6B7268" />

(Showing lines 220-249 of 412. Use offset=250 to continue.)
</content>
```

---

## Assistant (Build · DeepSeek V4 Flash Free · 6.1s)

**Tool: edit**

**Input:**
```json
{
  "filePath": "/media/xlegion/Win/PROJECTS/EdumentX/src/screens/student/StudentProfile.tsx",
  "newString": "import {\n  ScreenLayout,\n  ScreenHeader,\n  ScreenScroll,\n  ScreenSheet,\n} from \"@/components/shared/ScreenLayout\";",
  "oldString": "import {\n  ScreenLayout,\n  ScreenHeader,\n  ScreenScroll,\n} from \"@/components/shared/ScreenLayout\";"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · DeepSeek V4 Flash Free · 6.4s)

**Tool: edit**

**Input:**
```json
{
  "filePath": "/media/xlegion/Win/PROJECTS/EdumentX/src/screens/student/StudentProfile.tsx",
  "newString": "      {/* Profile body — light sheet overlapping the dark hero\n          (premium dark→light seam, shared `ScreenSheet` pattern) */}\n      <ScreenSheet>\n      <ScreenScroll>",
  "oldString": "      <ScreenScroll>"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · DeepSeek V4 Flash Free · 4.5s)

**Tool: read**

**Input:**
```json
{
  "filePath": "/media/xlegion/Win/PROJECTS/EdumentX/src/screens/student/StudentProfile.tsx",
  "limit": 25,
  "offset": 390
}
```

**Output:**
```
<path>/media/xlegion/Win/PROJECTS/EdumentX/src/screens/student/StudentProfile.tsx</path>
<type>file</type>
<content>
390:         <Text className="text-button font-semibold text-danger">
391:           Log out
392:         </Text>
393:         </Pressable>
394: 
395:         <Text className="text-caption text-text-muted text-center mt-6">
396:           EdumentX · v1.0 · build 2026.06.27
397:         </Text>
398:       </ScreenScroll>
399: 
400:       <BottomNav role="student" current="/stu-profile" />
401: 
402:       {/* Custom confirmation overlay — not a native Alert, per spec. */}
403:       <ConfirmDialog
404:         visible={confirmLogout}
405:         title="Log out?"
406:         message="You'll need to sign in again next time you open EdumentX."
407:         confirmLabel="Log out"
408:         cancelLabel="Stay signed in"
409:         destructive
410:         onConfirm={handleSignOut}
411:         onCancel={() => setConfirmLogout(false)}
412:       />
413:     </ScreenLayout>
414:   );

(Showing lines 390-414 of 416. Use offset=415 to continue.)
</content>
```

---

## Assistant (Build · DeepSeek V4 Flash Free · 7.5s)

**Tool: edit**

**Input:**
```json
{
  "filePath": "/media/xlegion/Win/PROJECTS/EdumentX/src/screens/student/StudentProfile.tsx",
  "newString": "      </ScreenScroll>\n      </ScreenSheet>\n\n      <BottomNav role=\"student\" current=\"/stu-profile\" />",
  "oldString": "      </ScreenScroll>\n\n      <BottomNav role=\"student\" current=\"/stu-profile\" />"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · DeepSeek V4 Flash Free · 7.8s)

Now Notification.tsx — wrap the tabs bar + list in the sheet:

**Tool: edit**

**Input:**
```json
{
  "filePath": "/media/xlegion/Win/PROJECTS/EdumentX/src/screens/shared/Notification.tsx",
  "newString": "import { ScreenLayout, ScreenSheet } from \"@/components/shared/ScreenLayout\";",
  "oldString": "import { ScreenLayout } from \"@/components/shared/ScreenLayout\";"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · DeepSeek V4 Flash Free · 4.1s)

**Tool: edit**

**Input:**
```json
{
  "filePath": "/media/xlegion/Win/PROJECTS/EdumentX/src/screens/shared/Notification.tsx",
  "newString": "      {/* Light content — tabs + list overlapping the dark hero\n          (premium dark→light seam, shared `ScreenSheet` pattern) */}\n      <ScreenSheet>\n      {/* Tabs */}\n      <ScrollView\n        horizontal\n        showsHorizontalScrollIndicator={false}\n        className=\"bg-surface border-b border-border px-4 py-3 flex-grow-0\"\n      >",
  "oldString": "      {/* Tabs */}\n      <ScrollView\n        horizontal\n        showsHorizontalScrollIndicator={false}\n        className=\"bg-surface border-b border-border px-4 py-3 flex-grow-0\"\n      >"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · DeepSeek V4 Flash Free · 3.5s)

**Tool: read**

**Input:**
```json
{
  "filePath": "/media/xlegion/Win/PROJECTS/EdumentX/src/screens/shared/Notification.tsx",
  "limit": 35,
  "offset": 395
}
```

**Output:**
```
<path>/media/xlegion/Win/PROJECTS/EdumentX/src/screens/shared/Notification.tsx</path>
<type>file</type>
<content>
395:       >
396:         {loading ? (
397:           <LoadingState />
398:         ) : filtered.length === 0 ? (
399:           <EmptyState tab={tab} />
400:         ) : (
401:           filtered.map((n) => (
402:             <Row key={n.id} n={n} onPress={() => markRead(n)} />
403:           ))
404:         )}
405:       </ScrollView>
406: 
407:       {/* Preferences overlay — kept inline (no separate file). Owns
408:           no business logic beyond toggling the `prefs` map. */}
409:       <NotificationPreferences
410:         visible={showPrefs}
411:         prefs={prefs}
412:         onToggle={togglePref}
413:         onClose={() => setShowPrefs(false)}
414:       />
415:     </ScreenLayout>
416:   );
417: }
418: 
419: /* ----------------------------- pieces ----------------------------- */
420: 
421: function Row({ n, onPress }: { n: NotifRow; onPress: () => void }) {
422:   const meta = TYPE_META[n.type];
423:   return (
424:     <Pressable
425:       onPress={onPress}
426:       accessibilityRole="button"
427:       accessibilityLabel={`${n.title}, ${formatRelative(
428:         n.timeMs ? new Date(n.timeMs) : null,
429:       )}`}

(Showing lines 395-429 of 687. Use offset=430 to continue.)
</content>
```

---

## Assistant (Build · DeepSeek V4 Flash Free · 7.1s)

**Tool: edit**

**Input:**
```json
{
  "filePath": "/media/xlegion/Win/PROJECTS/EdumentX/src/screens/shared/Notification.tsx",
  "newString": "        )}\n      </ScrollView>\n      </ScreenSheet>\n\n      {/* Preferences overlay — kept inline (no separate file). Owns\n          no business logic beyond toggling the `prefs` map. */}",
  "oldString": "        )}\n      </ScrollView>\n\n      {/* Preferences overlay — kept inline (no separate file). Owns\n          no business logic beyond toggling the `prefs` map. */}"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · DeepSeek V4 Flash Free · 8.1s)

Now the CompactCard verified badge (1.4):

**Tool: edit**

**Input:**
```json
{
  "filePath": "/media/xlegion/Win/PROJECTS/EdumentX/src/components/domain/TutorCard.tsx",
  "newString": "      <View className=\"p-3 gap-1\">\n        <View className=\"flex-row items-center gap-1\">\n          <Text\n            className={`text-card-title flex-1 ${\n              dark ? \"text-white\" : \"text-text-primary\"\n            }`}\n            numberOfLines={1}\n          >\n            {tutor.fullName}\n          </Text>\n          {tutor.isVerifiedProfessional ? (\n            <View className=\"-ml-0.5\">\n              <Ionicons\n                color={colors.brand.verification}\n                name=\"checkmark-circle\"\n                size={14}\n              />\n            </View>\n          ) : null}\n        </View>",
  "oldString": "      <View className=\"p-3 gap-1\">\n        <View className=\"flex-row items-center gap-1\">\n          <Text\n            className={`text-card-title flex-1 ${\n              dark ? \"text-white\" : \"text-text-primary\"\n            }`}\n            numberOfLines={1}\n          >\n            {tutor.fullName}\n          </Text>\n        </View>"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · DeepSeek V4 Flash Free · 8.5s)

**Tool: bash**

**Input:**
```json
{
  "command": "npx tsc --noEmit 2>&1 | head -20; echo \"TSC_EXIT: $?\""
}
```

**Output:**
```
TSC_EXIT: 0

```

---

## Assistant (Build · DeepSeek V4 Flash Free · 10.1s)

**Tool: bash**

**Input:**
```json
{
  "command": "npx eslint src --ext .ts,.tsx 2>&1 | tail -15"
}
```

**Output:**
```
/media/xlegion/Win/PROJECTS/EdumentX/src/services/enrollments/EnrollmentRepository.ts
  106:12  warning  Array type using 'ReadonlyArray<T>' is forbidden. Use 'readonly T[]' instead  @typescript-eslint/array-type

/media/xlegion/Win/PROJECTS/EdumentX/src/services/enrollments/FirebaseReviewRepository.ts
   20:3   warning  'setDoc' is defined but never used               @typescript-eslint/no-unused-vars
   21:3   warning  'deleteDoc' is defined but never used            @typescript-eslint/no-unused-vars
  128:15  warning  'prevSumRaw' is assigned a value but never used  @typescript-eslint/no-unused-vars

/media/xlegion/Win/PROJECTS/EdumentX/src/services/enrollments/dataSource.ts
  25:3  warning  Unused eslint-disable directive (no problems were reported from 'no-console')
  30:3  warning  Unused eslint-disable directive (no problems were reported from 'no-console')

✖ 28 problems (0 errors, 28 warnings)
  0 errors and 10 warnings potentially fixable with the `--fix` option.


```

---

## Assistant (Build · DeepSeek V4 Flash Free · 20.3s)

_Thinking:_

Phase 1 complete: tsc 0 errors, eslint 0 errors / 28 warnings (same baseline as before — pre-existing warnings).

Now Phase 2 — Map. Implementation plan:

1. **2.1 POI stripping in TutorMap.tsx:**
   - Add a `POI_FREE_STYLE` JSON constant for Android (Google style JSON that hides POIs: featureType "poi" elements with visibility off, plus transit).
   - iOS: `properties.pointsOfInterest = { including: [] }` — hmm, need to check: AppleMaps "To hide all POIs, set this to an empty array" — the `including` field. Wait, re-read: "The POI categories to include. To hide all POIs, set this to an empty array." — that's for `including`. And excluding is "To show all POIs, set this to an empty array." So `pointsOfInterest: { including: [] }` hides all. But careful: the mission says "keep transit icons/POIs only where the platform allows"; default = strip all POIs. Set `including: []`.
   - Android style JSON: standard POI-hiding style:
   ```json
   [
     { "featureType": "poi", "elementType": "labels", "stylers": [{ "visibility": "off" }] },
     { "featureType": "poi", "elementType": "geometry", "stylers": [{ "visibility": "off" }] },
     { "featureType": "transit", "stylers": [{ "visibility": "off" }] }
   ]
   ```
   Also maybe tone down landmarks. Actually — hiding all POI geometry might remove parks too. Let's hide POI labels but keep geometry for parks? The mission: "strip the stock Google icons (bus stops, shopping mall...)" — that's POI labels+icons. A common approach: `poi` labels off, `transit` labels off, keep road labels. I'll also add a subtle night-mode-ish tint? No — keep it minimal: hide poi + transit labels & icons. Let me also consider `poi.business` off. I'll write a focused JSON.

2. **2.2 Selected-pin + radius circle:**
   - In MapSearch: add `selectedTutor` state that tracks the currently selected tutor (for marker styling). When a tutor marker is tapped → setSelectedTutor + preview. Render a `MapCircle` under the selected tutor's pin with radius = service radius (2.5 km default when unset). Need a service-radius field — check TutorListing type for a `serviceRadiusKm` field. Let me check the type. If absent, use 2.5 default.
   - "Selected pin scales + white border": with expo-maps image markers we can't scale a single pin in place without swapping icons. Simplest honest implementation: generate a "selected" variant PNG? The generator script exists — I can add a `pin-tutor-selected.png` (white ring) + `pin-verified-selected.png` variants. Then in MapSearch, when selectedTutor matches, use the selected icon + the radius circle. That fulfills "verified ring/fill + checkmark hierarchy" and "selected scales with white border" (the white ring reads as the border). Plus the radius Circle (accentSoft low opacity).
   - Let me check the marker generator to add selected variants. The generator draws the badge with tail. I'll add `selected` variants with a white ring. Then regenerate PNGs. Also load them in markerIcons.

3. **2.3 Nearby strip → CompactCard**: replace `NearbyTutorRow` with `CompactCard` (compact-h) in a horizontal ScrollView. Keep the strip header. This reuses the shared TutorCard + the new verified badge.

4. **2.4 Filters actually filter**: lift filter state from FiltersSheet to MapSearch:
   - MapSearch owns `filters` state: subjects, level, mode, distance, budget, verifiedOnly. Pass as props to FiltersSheet (visible, onClose, initial, onChange). MapSearch filters `tutors` (geo) before clustering + nearby. Distance filter uses rankTutorsByDistance; budget filters monthlyRateNpr; verified filters isVerifiedProfessional; subjects filter subjects array.
   - FiltersSheet refactor: accept `value` + `onChange` props (controlled) or `initialValue` + `onApply`. I'll make it controlled-ish: FiltersSheet keeps local state initialized from a `filters` prop, and calls `onApply(next)` when "Show results" pressed + Reset calls onApply(reset). Keep the sheet's internal state for sliders UX; on show results → onApply.
   - MapSearch: `const [filters, setFilters] = useState<MapFilters>(default)`. Apply filters to `tutors` before geo/clustering.

5. **2.5 Search/filter alignment**: search bar `rounded-card` → `rounded-pill`; filter button `rounded-xl` → `rounded-pill`; both h-12. Also wrap the map area in ScreenSheet? The map: `View className="flex-1 relative"` — wrap in ScreenSheet (rounded-t-3xl -mt-4 overflow-hidden). That clips the map corners nicely. But note ScreenSheet sets `bg-background` — the map fills it. OK.

Let me check the TutorListing type for service radius and the FiltersSheet API design, then implement.

Phase 1 done (tsc clean, eslint same 28 pre-existing warnings). Moving to Phase 2 — first check the tutor listing type for a service-radius field:

**Tool: todowrite**

**Input:**
```json
{
  "todos": [
    {
      "content": "Phase 1: rounded-overlap sheet primitive + apply to Enrollment/AIChat/StudentProfile/Notification",
      "priority": "high",
      "status": "completed"
    },
    {
      "content": "Phase 1: CompactCard verified badge (TutorCard.tsx)",
      "priority": "high",
      "status": "completed"
    },
    {
      "content": "Phase 1: tsc + eslint verification",
      "priority": "high",
      "status": "completed"
    },
    {
      "content": "Phase 2: POI stripping (Android style JSON + iOS POI exclude) in TutorMap",
      "priority": "high",
      "status": "in_progress"
    },
    {
      "content": "Phase 2: selected-pin state + service-radius circle on map",
      "priority": "high",
      "status": "pending"
    },
    {
      "content": "Phase 2: nearby strip → CompactCard rows; preview sheet parity",
      "priority": "medium",
      "status": "pending"
    },
    {
      "content": "Phase 2: FiltersSheet actually filters the map",
      "priority": "high",
      "status": "pending"
    },
    {
      "content": "Phase 2: search/filter pill alignment + map seam sheet",
      "priority": "medium",
      "status": "pending"
    },
    {
      "content": "Phase 2: tsc + eslint verification",
      "priority": "high",
      "status": "pending"
    },
    {
      "content": "Phase 3: restandardize notifications path to anchor+inbox subcollection (notifications.ts, Notification.tsx, userLifecycle, rules)",
      "priority": "high",
      "status": "pending"
    },
    {
      "content": "Phase 3: NotificationBell + unread badge on 3 dashboards",
      "priority": "high",
      "status": "pending"
    },
    {
      "content": "Phase 3: push stub + decision note",
      "priority": "medium",
      "status": "pending"
    },
    {
      "content": "Phase 3: tsc + eslint verification",
      "priority": "high",
      "status": "pending"
    },
    {
      "content": "Final report",
      "priority": "medium",
      "status": "pending"
    }
  ]
}
```

**Output:**
```
[
  {
    "content": "Phase 1: rounded-overlap sheet primitive + apply to Enrollment/AIChat/StudentProfile/Notification",
    "status": "completed",
    "priority": "high"
  },
  {
    "content": "Phase 1: CompactCard verified badge (TutorCard.tsx)",
    "status": "completed",
    "priority": "high"
  },
  {
    "content": "Phase 1: tsc + eslint verification",
    "status": "completed",
    "priority": "high"
  },
  {
    "content": "Phase 2: POI stripping (Android style JSON + iOS POI exclude) in TutorMap",
    "status": "in_progress",
    "priority": "high"
  },
  {
    "content": "Phase 2: selected-pin state + service-radius circle on map",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "Phase 2: nearby strip → CompactCard rows; preview sheet parity",
    "status": "pending",
    "priority": "medium"
  },
  {
    "content": "Phase 2: FiltersSheet actually filters the map",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "Phase 2: search/filter pill alignment + map seam sheet",
    "status": "pending",
    "priority": "medium"
  },
  {
    "content": "Phase 2: tsc + eslint verification",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "Phase 3: restandardize notifications path to anchor+inbox subcollection (notifications.ts, Notification.tsx, userLifecycle, rules)",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "Phase 3: NotificationBell + unread badge on 3 dashboards",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "Phase 3: push stub + decision note",
    "status": "pending",
    "priority": "medium"
  },
  {
    "content": "Phase 3: tsc + eslint verification",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "Final report",
    "status": "pending",
    "priority": "medium"
  }
]
```

---

## Assistant (Build · DeepSeek V4 Flash Free · 8.4s)

**Tool: bash**

**Input:**
```json
{
  "command": "grep -n \"TutorListing\" src/lib/tutor/firestoreTutorService.ts | head -5; grep -n -A25 \"export type TutorListing\" src/lib/tutor/firestoreTutorService.ts | head -35"
}
```

**Output:**
```
47:export type TutorListing = {
70:const DEFAULT_TUTOR_LISTING: TutorListing = {
101:  onData: (tutors: TutorListing[]) => void,
115:      const tutors: TutorListing[] = snap.docs.map((d) => {
47:export type TutorListing = {
48-  uid: string;
49-  fullName: string;
50-  username: string;
51-  headline: string;
52-  subjects: string[];
53-  monthlyRateNpr: number;
54-  location: { neighborhood: string; city: string };
55-  /** GPS coordinates for map plotting — undefined for tutors registered
56-   *  before Phase 5.2 who haven't updated their profile with a location pin. */
57-  coordinates?: { latitude: number; longitude: number };
58-  photoUrl: string | null;
59-  verificationStatus: string;
60-  isVerifiedProfessional: boolean;
61-  hasPendingUpdate: boolean;
62-  rating: number;
63-  reviewCount: number;
64-  yearsExperience: number;
65-  gender: "male" | "female" | "other" | null;
66-};
67-
68-// ─── List subscription ───────────────────────────────────────────────────────
69-
70-const DEFAULT_TUTOR_LISTING: TutorListing = {
71-  uid: "",
72-  fullName: "",

```

---

## Assistant (Build · DeepSeek V4 Flash Free · 16.5s)

_Thinking:_

No `serviceRadiusKm` field on TutorListing. The mission says "service radius (default 2.5 km when unset)". I'll define a constant `DEFAULT_SERVICE_RADIUS_KM = 2.5` in the map layer and use it for the selected circle (no data source change needed — keeps scope tight).

Now implement the POI stripping in TutorMap.tsx:

1. Android: add `mapStyleOptions: { json: POI_FREE_GOOGLE_STYLE }` to the GoogleMaps properties.
2. iOS: add `pointsOfInterest: { including: [] }` to AppleMaps properties.

Let me write the style JSON. A clean POI-free style for Google Maps JSON (mapstyle.withgoogle.com format):

```json
[
  { "featureType": "poi", "elementType": "labels", "stylers": [{ "visibility": "off" }] },
  { "featureType": "poi", "elementType": "geometry", "stylers": [{ "visibility": "off" }] },
  { "featureType": "transit", "stylers": [{ "visibility": "off" }] }
]
```

Hmm — hiding ALL poi geometry removes parks (park is poi.park). Do we want parks? The mission says strip "stock Google icons (bus stops, mall...)". Roads + parks visual would be nice to keep. Let me be surgical:

```json
[
  { "featureType": "poi", "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] },
  { "featureType": "poi", "elementType": "labels.text", "stylers": [{ "visibility": "off" }] },
  { "featureType": "transit", "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] }
]
```

Wait — in Google style JSON, `elementType` values are "all", "geometry", "geometry.fill", "geometry.stroke", "labels", "labels.icon", "labels.text", "labels.text.fill", "labels.text.stroke". So `labels.icon` and `labels.text` are valid. This removes the POI *icons and labels* (the visible clutter) while keeping park geometry fills. That's exactly "stock icons gone, roads/parks remain". Transit station icons are also labels.icon under featureType transit.

Hmm, but the bus-stop icon is actually under "transit" featureType? Google Maps style JSON has no "transit" featureType actually — the feature types are: administrative, landscape, poi, road, transit... wait yes: featureType "transit" exists (transit lines/stations). Actually let me recall: Google Maps JSON style featureTypes: "administrative", "landscape", "poi", "road", "transit", "water". Yes, "transit" is a valid featureType. OK.

So:
```json
[
  { "featureType": "poi", "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] },
  { "featureType": "poi", "elementType": "labels.text", "stylers": [{ "visibility": "off" }] },
  { "featureType": "transit", "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] }
]
```

That strips stock POI icons + labels, keeps the map clean. 

For iOS: `pointsOfInterest: { including: [] }` hides ALL POIs (including parks?) on Apple Maps — the Apple MapKit POI categories include park etc. The mission says "keep transit/POIs only where the platform allows" — actually the mission says "strip the stock Google icons... keep transit icons/POIs only where the platform allows". Hmm, re-reading 2.1: "Stock Google icons (bus stops, mall icon, restaurant icons) currently clutter the map... strip POI icons/labels from the base layer — keep transit icons/POIs only where the platform allows." So the preference: strip POIs, keep transit where possible. On Android: strip poi labels/icons, keep transit (my JSON above keeps transit geometry, hides transit icons too — hmm). Let me keep transit icons ON Android (the JSON only hides poi labels/icons). On iOS: `including: []` hides everything including transit. There's no granularity to keep only transit on iOS via the API (there's no "transit only" preset — categories are granular like `ATM`, `parking`, `publicTransit`...). Actually AppleMapPointOfInterestCategory has `publicTransit`? Let me check the enum — it likely includes `AIRPORT`, `PUBLIC_TRANSIT`... Let me check.

No service-radius field — I'll use a 2.5 km default constant. Let me check the iOS POI category enum for transit granularity:

**Tool: bash**

**Input:**
```json
{
  "command": "sed -n '116,210p' node_modules/expo-maps/build/apple/AppleMaps.types.d.ts"
}
```

**Output:**
```
 * @see https://developer.apple.com/documentation/mapkit/AppleMapPointOfInterestCategory
 */
export declare enum AppleMapPointOfInterestCategory {
    MUSEUM = "MUSEUM",
    MUSIC_VENUE = "MUSIC_VENUE",
    THEATER = "THEATER",
    LIBRARY = "LIBRARY",
    PLANETARIUM = "PLANETARIUM",
    SCHOOL = "SCHOOL",
    UNIVERSITY = "UNIVERSITY",
    MOVIE_THEATER = "MOVIE_THEATER",
    NIGHTLIFE = "NIGHTLIFE",
    FIRE_STATION = "FIRE_STATION",
    HOSPITAL = "HOSPITAL",
    PHARMACY = "PHARMACY",
    POLICE = "POLICE",
    CASTLE = "CASTLE",
    FORTRESS = "FORTRESS",
    LANDMARK = "LANDMARK",
    NATIONAL_MONUMENT = "NATIONAL_MONUMENT",
    BAKERY = "BAKERY",
    BREWERY = "BREWERY",
    CAFE = "CAFE",
    DISTILLERY = "DISTILLERY",
    FOOD_MARKET = "FOOD_MARKET",
    RESTAURANT = "RESTAURANT",
    WINERY = "WINERY",
    ANIMAL_SERVICE = "ANIMAL_SERVICE",
    ATM = "ATM",
    AUTOMOTIVE_REPAIR = "AUTOMOTIVE_REPAIR",
    BANK = "BANK",
    BEAUTY = "BEAUTY",
    EV_CHARGER = "EV_CHARGER",
    FITNESS_CENTER = "FITNESS_CENTER",
    LAUNDRY = "LAUNDRY",
    MAILBOX = "MAILBOX",
    POST_OFFICE = "POST_OFFICE",
    RESTROOM = "RESTROOM",
    SPA = "SPA",
    STORE = "STORE",
    AMUSEMENT_PARK = "AMUSEMENT_PARK",
    AQUARIUM = "AQUARIUM",
    BEACH = "BEACH",
    CAMPGROUND = "CAMPGROUND",
    FAIRGROUND = "FAIRGROUND",
    MARINA = "MARINA",
    NATIONAL_PARK = "NATIONAL_PARK",
    PARK = "PARK",
    RV_PARK = "RV_PARK",
    ZOO = "ZOO",
    BASEBALL = "BASEBALL",
    BASKETBALL = "BASKETBALL",
    BOWLING = "BOWLING",
    GO_KART = "GO_KART",
    GOLF = "GOLF",
    HIKING = "HIKING",
    MINI_GOLF = "MINI_GOLF",
    ROCK_CLIMBING = "ROCK_CLIMBING",
    SKATE_PARK = "SKATE_PARK",
    SKATING = "SKATING",
    SKIING = "SKIING",
    SOCCER = "SOCCER",
    STADIUM = "STADIUM",
    TENNIS = "TENNIS",
    VOLLEYBALL = "VOLLEYBALL",
    AIRPORT = "AIRPORT",
    CAR_RENTAL = "CAR_RENTAL",
    CONVENTION_CENTER = "CONVENTION_CENTER",
    GAS_STATION = "GAS_STATION",
    HOTEL = "HOTEL",
    PARKING = "PARKING",
    PUBLIC_TRANSPORT = "PUBLIC_TRANSPORT",
    FISHING = "FISHING",
    KAYAKING = "KAYAKING",
    SURFING = "SURFING",
    SWIMMING = "SWIMMING"
}
/**
 * @platform ios
 */
export type AppleMapsPointOfInterestCategories = {
    /**
     * The POI categories to include.
     * To hide all POIs, set this to an empty array.
     */
    including?: AppleMapPointOfInterestCategory[];
    /**
     * The POI categories to exclude.
     * To show all POIs, set this to an empty array.
     */
    excluding?: AppleMapPointOfInterestCategory[];
};
/**
 * @platform ios
 */

```

---

## Assistant (Build · DeepSeek V4 Flash Free · 12.1s)

_Thinking:_

iOS has granular categories including `PUBLIC_TRANSPORT`. So the "keep transit, strip everything else" is expressible: `pointsOfInterest: { including: ["PUBLIC_TRANSPORT"] }`. That matches the mission's "keep transit icons/POIs only where the platform allows".

Now implement TutorMap.tsx changes:

1. Add constants:
```ts
const GOOGLE_POI_FREE_STYLE = JSON.stringify([...]);
const APPLE_TRANSIT_ONLY_POI = { including: ["PUBLIC_TRANSPORT"] as const };
```

Hmm — `pointsOfInterest` expects `AppleMapsPointOfInterestCategories`. I'll pass `{ including: [AppleMapPointOfInterestCategory.PUBLIC_TRANSPORT] }`? The enum is exported from expo-maps? Let me check index.d.ts exports: "const MapType" etc. — Apple types export `AppleMaps.MapType`... The enum `AppleMapPointOfInterestCategory` — exported via `AppleMaps.PointOfInterestCategory`? Let me check index.d.ts for AppleMaps namespace.

Actually simplest: pass the string literal `"PUBLIC_TRANSPORT"` — TS may complain unless the type is the enum (string union). The type is `AppleMapPointOfInterestCategory[]` — a string enum. String literals aren't assignable to enum types. But expo-maps might define the enum as a string union type or a const enum. Let me check how it's exported.

iOS supports granular categories (`PUBLIC_TRANSPORT` exists). Let me check how the Apple namespace exports the enum:

**Tool: bash**

**Input:**
```json
{
  "command": "sed -n '1,60p' node_modules/expo-maps/build/index.d.ts; echo ===; grep -n \"PointOfInterestCategory\\|PUBLIC_TRANSPORT\" node_modules/expo-maps/build/index.d.ts node_modules/expo-maps/build/apple/index.d.ts 2>/dev/null | head"
}
```

**Output:**
```
import * as AppleTypes from './apple/AppleMaps.types';
import * as GoogleTypes from './google/GoogleMaps.types';
import { GoogleStreetView } from './google/GoogleStreetView';
/**
 * @hidden
 */
export declare namespace GoogleMaps {
    const View: import("react").ForwardRefExoticComponent<Omit<GoogleTypes.GoogleMapsViewProps, "ref"> & import("react").RefAttributes<GoogleTypes.GoogleMapsViewType>>;
    const StreetView: typeof GoogleStreetView;
    const MapType: typeof GoogleTypes.GoogleMapsMapType;
    type MapType = GoogleTypes.GoogleMapsMapType;
    const MapColorScheme: typeof GoogleTypes.GoogleMapsColorScheme;
    type MapColorScheme = GoogleTypes.GoogleMapsColorScheme;
    type Marker = GoogleTypes.GoogleMapsMarker;
    type MapUISettings = GoogleTypes.GoogleMapsUISettings;
    type MapProperties = GoogleTypes.GoogleMapsProperties;
    type MapProps = GoogleTypes.GoogleMapsViewProps;
    type MapView = GoogleTypes.GoogleMapsViewType;
    type StreetViewProps = GoogleTypes.GoogleStreetViewProps;
}
/**
 * @hidden
 */
export declare namespace AppleMaps {
    const View: import("react").ForwardRefExoticComponent<Omit<AppleTypes.AppleMapsViewProps, "ref"> & import("react").RefAttributes<AppleTypes.AppleMapsViewType>>;
    const MapType: typeof AppleTypes.AppleMapsMapType;
    type MapType = AppleTypes.AppleMapsMapType;
    type Marker = AppleTypes.AppleMapsMarker;
    type MapUISettings = AppleTypes.AppleMapsUISettings;
    type MapProperties = AppleTypes.AppleMapsProperties;
    type MapProps = AppleTypes.AppleMapsViewProps;
    type MapView = AppleTypes.AppleMapsViewType;
}
export declare const requestPermissionsAsync: () => Promise<import("expo-modules-core").PermissionResponse>;
export declare const getPermissionsAsync: () => Promise<import("expo-modules-core").PermissionResponse>;
/**
 * Check or request permissions to access the location.
 * This uses both `requestPermissionsAsync` and `getPermissionsAsync` to interact with the permissions.
 *
 * @example
 * ```ts
 * const [status, requestPermission] = useLocationPermissions();
 * ```
 */
export declare const useLocationPermissions: (options?: import("expo-modules-core").PermissionHookOptions<object> | undefined) => [import("expo-modules-core").PermissionResponse | null, () => Promise<import("expo-modules-core").PermissionResponse>, () => Promise<import("expo-modules-core").PermissionResponse>];
export * from './shared.types';
//# sourceMappingURL=index.d.ts.map===

```

---

## Assistant (Build · DeepSeek V4 Flash Free · 40.4s)

_Thinking:_

`AppleMaps` namespace doesn't re-export `PointOfInterestCategory` (only MapType etc.). But `AppleMapsProperties.pointsOfInterest` is typed as `AppleMapsPointOfInterestCategories` with `including?: AppleMapPointOfInterestCategory[]`. Since `AppleMapPointOfInterestCategory` is a string enum, I can import it directly: `import { AppleMaps, type AppleMapPointOfInterestCategory } from 'expo-maps'`? Is it exported from the package root? The index exports `AppleTypes` only internally via namespace. `import { AppleMaps } from 'expo-maps'` — the namespace has View/MapType/MapProperties types. The enum isn't re-exported. But `AppleMaps.types` (the module `AppleTypes`) — not exported publicly.

Simplest: cast the literal. Since it's a string enum with values like "PUBLIC_TRANSPORT", I can do:
```ts
pointsOfInterest: { including: ["PUBLIC_TRANSPORT" as unknown as any] }
```
Hmm — avoid `any`. Cleaner: `import { AppleMaps } from 'expo-maps'` and use `AppleMaps.MapType`-style... doesn't have the enum. I'll define:
```ts
const TRANSIT_ONLY_POI = {
  including: ["PUBLIC_TRANSPORT"],
} as AppleMapsPointOfInterestCategories;
```
Is `AppleMapsPointOfInterestCategories` exported? It's `export type` in AppleMaps.types.d.ts but not re-exported in the namespace. Hmm. Can I import it from 'expo-maps' directly? The types file is `./apple/AppleMaps.types` — deep import path isn't public. 

Options: cast through an intermediate. Let me check whether `AppleMapPointOfInterestCategory` is exported from 'expo-maps' — grep the root index for the export list. The index only does `export * from './shared.types'` and defines the two namespaces. So no.

Pragmatic approach: build the object literal in a way TS accepts. Since the app already uses `as any` in TutorMap for e.g. `style as any` and props like that (it's already loosely typed with `e: any` handlers), one narrowly-scoped cast is acceptable:

```ts
const APPLE_TRANSIT_ONLY_POI = {
  including: ["PUBLIC_TRANSPORT"],
} as unknown as AppleMaps.MapProperties["pointsOfInterest"];
```

`AppleMaps.MapProperties` IS exported as a type. So `AppleMaps.MapProperties["pointsOfInterest"]` = `AppleMapsPointOfInterestCategories`. 

Now let me write the TutorMap changes:

1. Add the constants at the top.
2. IosMap: pass `pointsOfInterest` in properties.
3. AndroidMap: pass `mapStyleOptions` in properties.

The style JSON — keep it minimal and documented:
```json
[
  {"featureType":"poi","elementType":"labels.icon","stylers":[{"visibility":"off"}]},
  {"featureType":"poi","elementType":"labels.text","stylers":[{"visibility":"off"}]}
]
```
This strips POI icons + labels (bus stops, mall, restaurants) while keeping roads/parks geometry. Should I also strip transit labels? The mission: "keep transit icons/POIs only where the platform allows" — Android: keep transit (my JSON doesn't touch transit). iOS: transit only.

Also — the mission says "Also keep the default map type (NORMAL)". Fine, no change.

Then for 2.2 selected pin + circle. Let me also add the "selected" marker variants. Check the generator script more (drawing logic) to add a white-ring variant. Let me read the rest of the generator.

`AppleMaps.MapProperties` type is exported — I can type the POI config through it. Now implementing POI stripping in TutorMap:



**Tool: edit**

**Input:**
```json
{
  "filePath": "/media/xlegion/Win/PROJECTS/EdumentX/src/components/map/TutorMap.tsx",
  "newString": "// ─── Camera helpers ─────────────────────────────────────────────────────────\n\n/**\n * POI-free base layer (Android / Google Maps).\n *\n * expo-maps does not expose a `showsPointsOfInterest`-style boolean\n * (that's react-native-maps), but its Android native module DOES apply\n * a raw Google Maps style JSON via `properties.mapStyleOptions`\n * (`MapStyleOptions(json)` — no paid mapId needed). This JSON hides the\n * stock POI icons + labels (bus stops, shop, restaurant glyphs) that\n * clutter the tutor map, while keeping roads, parks and water intact.\n * Transit is intentionally left visible on Android (the platform\n * allows it).\n *\n * Style controls live here, next to the map, not in the screen.\n */\nconst GOOGLE_POI_FREE_STYLE = JSON.stringify([\n  {\n    featureType: \"poi\",\n    elementType: \"labels.icon\",\n    stylers: [{ visibility: \"off\" }],\n  },\n  {\n    featureType: \"poi\",\n    elementType: \"labels.text\",\n    stylers: [{ visibility: \"off\" }],\n  },\n]);\n\n/**\n * POI policy on iOS (Apple Maps). The platform supports granular POI\n * categories, but NOT a style JSON — so we keep the one category that\n * helps navigation (public transport) and exclude everything else.\n */\nconst APPLE_TRANSIT_ONLY_POI = {\n  including: [\"PUBLIC_TRANSPORT\"],\n} as unknown as AppleMaps.MapProperties[\"pointsOfInterest\"];",
  "oldString": "// ─── Camera helpers ─────────────────────────────────────────────────────────"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · DeepSeek V4 Flash Free · 75.9s)

**Tool: edit**

**Input:**
```json
{
  "filePath": "/media/xlegion/Win/PROJECTS/EdumentX/src/components/map/TutorMap.tsx",
  "newString": "properties={{ isMyLocationEnabled, pointsOfInterest: APPLE_TRANSIT_ONLY_POI }}",
  "oldString": "properties={{ isMyLocationEnabled }}"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · DeepSeek V4 Flash Free · 11.1s)

**Tool: edit**

**Input:**
```json
{
  "filePath": "/media/xlegion/Win/PROJECTS/EdumentX/src/components/map/TutorMap.tsx",
  "newString": "properties={{\n        isMyLocationEnabled,\n        // POI-free base layer (see GOOGLE_POI_FREE_STYLE above).\n        mapStyleOptions: { json: GOOGLE_POI_FREE_STYLE },\n        // Hard zoom floor/ceiling (Nepal-only app: no world zoom-out).\n        minZoomPreference: NEPAL_ZOOM_RANGE.min,\n        maxZoomPreference: NEPAL_ZOOM_RANGE.max,\n      }}",
  "oldString": "properties={{\n        isMyLocationEnabled,\n        // Hard zoom floor/ceiling (Nepal-only app: no world zoom-out).\n        minZoomPreference: NEPAL_ZOOM_RANGE.min,\n        maxZoomPreference: NEPAL_ZOOM_RANGE.max,\n      }}"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · DeepSeek V4 Flash Free · 22.8s)

_Thinking:_

Now 2.2: selected-pin state + service-radius circle. Let me generate the "selected" pin variants (white ring). Let me read the marker generator's badge drawing code to add variants.

Now the selected-pin variants. Let me see the rest of the generator's

**Tool: bash**

**Input:**
```json
{
  "command": "sed -n '50,180p' scripts/generate-markers.mjs"
}
```

**Output:**
```
  const qy = Math.abs(py - cy) - (hh - r);
  const ox = Math.max(qx, 0);
  const oy = Math.max(qy, 0);
  return Math.hypot(ox, oy) + Math.min(Math.max(qx, qy), 0) - r;
}

/**
 * Signed distance inside an isoceles downward triangle (negative = inside).
 * Points above the base report +Infinity so `min(body, tail)` keeps the
 * badge’s distance there; points below the tip fall back to the corner
 * distance.
 */
function sdTriangle(px, py, cx, halfBase, topY, tipY) {
  if (py < topY) return Infinity;
  const t = clamp01((py - topY) / (tipY - topY));
  const halfAtY = halfBase * (1 - t);
  const sdX = Math.abs(px - cx) - halfAtY;
  const dyBottom = py - tipY; // > 0 below the tip
  if (dyBottom > 0) {
    return Math.hypot(Math.max(sdX, 0), dyBottom);
  }
  // Inside the vertical span: signed distance to the left/right edges.
  return sdX;
}

function cover(dist) {
  return clamp01(0.5 - dist);
}

// ── Pin geometry (logical px) ────────────────────────────────────────────────

const CY = 24; // badge center — badge spans y 9..39, tail 39..59
const TAIL_TOP = 36;
const TAIL_TIP = 74;

/**
 * Builds the per-pixel RGBA color for one pin shape.
 * Layers: badge+tail fill → white ring (outer disc minus inner disc) →
 * center dot. Composite via alpha lerp, clamp at the end.
 * Returns [r,g,b,a] floats 0..1.
 */
function pinPixel(px, py, { body, dot }) {
  const bodyDist = Math.min(
    sdRoundRect(px, py, 32, CY, 17, 17, 10),
    sdTriangle(px, py, 32, 15, TAIL_TOP, TAIL_TIP),
  );

  // cover() on a signed distance → 1 deep inside, 0 far outside.
  const wBody = cover(bodyDist);

  const ringOuter = 13;
  const ringInner = ringOuter - 4;
  // Annulus: inside outer disc, outside inner disc.
  const wWhiteRing =
    cover(sdCircle(px, py, 32, CY, ringOuter)) *
    (1 - cover(sdCircle(px, py, 32, CY, ringInner)));

  const wDot = cover(sdCircle(px, py, 32, CY, 5.5));

  const lerp = (t) => (u, x) => u * (1 - t) + x * t;

  // rgb work in 0..255 scale (body/dot colors are raw hex bands), alpha in 0..1.
  let [r, g, b, a] = [0, 0, 0, 0];
  [r, g, b, a] = [lerp(wBody)(r, body[0]), lerp(wBody)(g, body[1]), lerp(wBody)(b, body[2]), lerp(wBody)(a, 1)];
  [r, g, b, a] = [lerp(wWhiteRing)(r, 255), lerp(wWhiteRing)(g, 255), lerp(wWhiteRing)(b, 255), lerp(wWhiteRing)(a, 1)];
  [r, g, b, a] = [lerp(wDot)(r, dot[0]), lerp(wDot)(g, dot[1]), lerp(wDot)(b, dot[2]), lerp(wDot)(a, 1)];
  return [r, g, b, a];
}

// ── Render a pin at supersample → downsample → Uint8 RGBA ─────────────────────

function render(shape) {
  const buf = Buffer.alloc(W * H * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let ar = 0, ag = 0, ab = 0, aa = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const px = x + (sx + 0.5) / SS;
          const py = y + (sy + 0.5) / SS;
          const [r, g, b, a] = pinPixel(px, py, shape);
          ar += r; ag += g; ab += b; aa += a;
        }
      }
      const n = SS * SS;
      const o = (y * W + x) * 4;
      // rgb come back in 0..255 units, alpha in 0..1 units.
      const c255 = (v) => Math.round(Math.max(0, Math.min(255, v)));
      buf[o + 0] = c255(ar / n);
      buf[o + 1] = c255(ag / n);
      buf[o + 2] = c255(ab / n);
      buf[o + 3] = Math.round(clamp01(aa / n) * 255);
    }
  }
  return buf;
}

// ── Minimal PNG encoder ──────────────────────────────────────────────────────

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePng(width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const stride = width * 4;

```

---

## Assistant (Build · DeepSeek V4 Flash Free · 14.5s)

**Tool: bash**

**Input:**
```json
{
  "command": "sed -n '180,240p' scripts/generate-markers.mjs"
}
```

**Output:**
```
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ── Emit ─────────────────────────────────────────────────────────────────────

const PINS = [
  {
    file: "pin-tutor.png",
    shape: { body: C.amber, dot: C.slate },
  },
  {
    file: "pin-verified.png",
    shape: { body: C.green, dot: C.white },
  },
  {
    file: "pin-cluster.png",
    shape: { body: C.slate, dot: C.amber },
  },
];

mkdirSync(OUT_DIR, { recursive: true });
for (const pin of PINS) {
  const png = encodePng(W, H, render(pin.shape));
  const out = join(OUT_DIR, pin.file);
  writeFileSync(out, png);
  console.log(`wrote ${out} (${png.length} bytes)`);
}
```

---

## Assistant (Build · DeepSeek V4 Flash Free · 110.3s)

_Thinking:_

The generator is clean and easy to extend. I'll add a `selected` layer: a white ring around the badge (wider, brighter than the inner dot ring). Actually the shape already has a white ring annulus (ringOuter=13, ringInner=9 → 4px white ring) — wait, is the ring part of the default pins? Yes! `wWhiteRing` is computed and composited for ALL pins. So the current pins already have a 4px white ring around the badge. Interesting.

For the "selected" variant, I want a clearly distinct treatment: a thicker/outward white ring + slightly darker body, or a larger ring. Options in the generator:
- `ringOuter` bigger (e.g. 19) with white ring → looks like a halo.
- Also brighten body or keep same.

I'll add a `selected` boolean to the shape: when true, ringOuter=20, ringInner=15 (5px white ring) — reads as a selection halo. Plus the on-map Circle under it for the radius.

Now update:
1. Generator: add `selected` option; new PINS: pin-tutor-selected.png (amber body, slate dot, big white ring), pin-verified-selected.png (green body, white dot, big white ring). Note: cluster pins don't need a selected variant.
   - CAC: `pinPixel` needs to know the ring size → param. I'll extend `shape` with `selected?: boolean` and compute ringOuter/ringInner accordingly.
2. markerIcons.ts: load the two new variants → MarkerIconSet extended: `tutorSelected`, `verifiedSelected`.
3. MapSearch: when a tutor marker is selected → use the selected icon (fall back to base), and render a MapCircle at the tutor's coordinates with radius 2500m (2.5 km default), fill = accentSoft low opacity (rgba amber), stroke accent. And the preview sheet shows on tap (already does). Also `selectedTutorId` state to drive icon swap + circle.

Wait — where does the "selected" icon swap go? `markers` prop → for the markers map, check `c.id === selectedTutorId`. The `visibleClusters` filter holds back tutor markers while pins are pending — fine.

Also add `service radius (default 2.5 km when unset)` — no field on the listing; use constant DEFAULT_SERVICE_RADIUS_KM = 2.5.

Note: markers' icon swap needs the selected icon loaded — avatar drop pins also need a "selected" concept... For avatar pins (photo teardrops), the photo pins don't have a selected variant. Hmm. The avatar pin is the primary icon once rasterized. Can I make the selected state visible with avatar pins? The mission says "selected pin scales + white border, and draws a translucent service-radius Circle underneath". For photo pins, the white-border can't be swapped easily without another rasterized variant... 

Options:
a) Generate "frame" pins only for the PNG fallbacks (no photo): when selected and photo pin exists, keep the photo pin + the radius circle underneath — the circle itself communicates selection.
b) Rasterize a selected variant in avatarPins too (extra capture per tutor — adds complexity/time).

The pragmatic call: selected state = radius Circle (strong signal) + icon swap for non-photo pins (PNG fallback path). For photo pins, the Circle + preview sheet already signal selection. That's honest and bounded. Actually — wait. Let me check TutorAvatarPin.tsx: it renders a teardrop + photo + shield-checkmark if verified. I could add a white ring around the teardrop in the rasterizer when `selected`... but the pins map is keyed by (photoUrl × verified) only; adding `selected` keys would double the captures. Given the complexity budget, I'll implement: Circle + PNG-selected icon swap + keep photo pins untouched (document this). 

Hmm, actually there's a simpler trick: expo-maps markers... no view-children support. Marker `icon` only. OK going with the plan above.

Let me now update the generator.

The generator already draws a 4px white ring on every pin. I'll add `selected` variants with

**Tool: edit**

**Input:**
```json
{
  "filePath": "/media/xlegion/Win/PROJECTS/EdumentX/scripts/generate-markers.mjs",
  "newString": "/**\n * Builds the per-pixel RGBA color for one pin shape.\n * Layers: badge+tail fill → white ring (outer disc minus inner disc) →\n * center dot. Composite via alpha lerp, clamp at the end.\n * Returns [r,g,b,a] floats 0..1.\n *\n * `shape.selected` widens the white ring into a selection halo — the\n * on-map \"this pin is selected\" state (used for the map's selected\n * tutor alongside the translucent service-radius Circle).\n */\nfunction pinPixel(px, py, shape) {\n  const bodyDist = Math.min(\n    sdRoundRect(px, py, 32, CY, 17, 17, 10),\n    sdTriangle(px, py, 32, 15, TAIL_TOP, TAIL_TIP),\n  );\n\n  // cover() on a signed distance → 1 deep inside, 0 far outside.\n  const wBody = cover(bodyDist);\n\n  const ringOuter = shape.selected ? 20 : 13;\n  const ringInner = shape.selected ? 15 : ringOuter - 4;\n  // Annulus: inside outer disc, outside inner disc.\n  const wWhiteRing =\n    cover(sdCircle(px, py, 32, CY, ringOuter)) *\n    (1 - cover(sdCircle(px, py, 32, CY, ringInner)));\n\n  const wDot = cover(sdCircle(px, py, 32, CY, 5.5));\n\n  const lerp = (t) => (u, x) => u * (1 - t) + x * t;\n\n  // rgb work in 0..255 scale (body/dot colors are raw hex bands), alpha in 0..1.\n  let [r, g, b, a] = [0, 0, 0, 0];\n  [r, g, b, a] = [lerp(wBody)(r, shape.body[0]), lerp(wBody)(g, shape.body[1]), lerp(wBody)(b, shape.body[2]), lerp(wBody)(a, 1)];\n  [r, g, b, a] = [lerp(wWhiteRing)(r, 255), lerp(wWhiteRing)(g, 255), lerp(wWhiteRing)(b, 255), lerp(wWhiteRing)(a, 1)];\n  [r, g, b, a] = [lerp(wDot)(r, shape.dot[0]), lerp(wDot)(g, shape.dot[1]), lerp(wDot)(b, shape.dot[2]), lerp(wDot)(a, 1)];\n  return [r, g, b, a];\n}",
  "oldString": "/**\n * Builds the per-pixel RGBA color for one pin shape.\n * Layers: badge+tail fill → white ring (outer disc minus inner disc) →\n * center dot. Composite via alpha lerp, clamp at the end.\n * Returns [r,g,b,a] floats 0..1.\n */\nfunction pinPixel(px, py, { body, dot }) {\n  const bodyDist = Math.min(\n    sdRoundRect(px, py, 32, CY, 17, 17, 10),\n    sdTriangle(px, py, 32, 15, TAIL_TOP, TAIL_TIP),\n  );\n\n  // cover() on a signed distance → 1 deep inside, 0 far outside.\n  const wBody = cover(bodyDist);\n\n  const ringOuter = 13;\n  const ringInner = ringOuter - 4;\n  // Annulus: inside outer disc, outside inner disc.\n  const wWhiteRing =\n    cover(sdCircle(px, py, 32, CY, ringOuter)) *\n    (1 - cover(sdCircle(px, py, 32, CY, ringInner)));\n\n  const wDot = cover(sdCircle(px, py, 32, CY, 5.5));\n\n  const lerp = (t) => (u, x) => u * (1 - t) + x * t;\n\n  // rgb work in 0..255 scale (body/dot colors are raw hex bands), alpha in 0..1.\n  let [r, g, b, a] = [0, 0, 0, 0];\n  [r, g, b, a] = [lerp(wBody)(r, body[0]), lerp(wBody)(g, body[1]), lerp(wBody)(b, body[2]), lerp(wBody)(a, 1)];\n  [r, g, b, a] = [lerp(wWhiteRing)(r, 255), lerp(wWhiteRing)(g, 255), lerp(wWhiteRing)(b, 255), lerp(wWhiteRing)(a, 1)];\n  [r, g, b, a] = [lerp(wDot)(r, dot[0]), lerp(wDot)(g, dot[1]), lerp(wDot)(b, dot[2]), lerp(wDot)(a, 1)];\n  return [r, g, b, a];\n}"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · DeepSeek V4 Flash Free · 22.7s)

**Tool: edit**

**Input:**
```json
{
  "filePath": "/media/xlegion/Win/PROJECTS/EdumentX/scripts/generate-markers.mjs",
  "newString": "const PINS = [\n  {\n    file: \"pin-tutor.png\",\n    shape: { body: C.amber, dot: C.slate },\n  },\n  {\n    file: \"pin-verified.png\",\n    shape: { body: C.green, dot: C.white },\n  },\n  {\n    file: \"pin-cluster.png\",\n    shape: { body: C.slate, dot: C.amber },\n  },\n  // Selection halo variants — swapped in when the student taps a pin;\n  // the white ring reads as the \"selected\" border.\n  {\n    file: \"pin-tutor-selected.png\",\n    shape: { body: C.amber, dot: C.slate, selected: true },\n  },\n  {\n    file: \"pin-verified-selected.png\",\n    shape: { body: C.green, dot: C.white, selected: true },\n  },\n];",
  "oldString": "const PINS = [\n  {\n    file: \"pin-tutor.png\",\n    shape: { body: C.amber, dot: C.slate },\n  },\n  {\n    file: \"pin-verified.png\",\n    shape: { body: C.green, dot: C.white },\n  },\n  {\n    file: \"pin-cluster.png\",\n    shape: { body: C.slate, dot: C.amber },\n  },\n];"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · DeepSeek V4 Flash Free · 65.8s)

**Tool: bash**

**Input:**
```json
{
  "command": "node scripts/generate-markers.mjs && ls -la assets/markers/"
}
```

**Output:**
```
wrote /media/xlegion/Win/PROJECTS/EdumentX/assets/markers/pin-tutor.png (1464 bytes)
wrote /media/xlegion/Win/PROJECTS/EdumentX/assets/markers/pin-verified.png (1437 bytes)
wrote /media/xlegion/Win/PROJECTS/EdumentX/assets/markers/pin-cluster.png (1410 bytes)
wrote /media/xlegion/Win/PROJECTS/EdumentX/assets/markers/pin-tutor-selected.png (1647 bytes)
wrote /media/xlegion/Win/PROJECTS/EdumentX/assets/markers/pin-verified-selected.png (1642 bytes)
total 21
drwxr-xr-x 1 xlegion xlegion  520 Aug  9 17:01 .
drwxr-xr-x 1 xlegion xlegion    0 Aug  9 09:37 ..
-rwxr-xr-x 1 xlegion xlegion 1410 Aug  9 17:01 pin-cluster.png
-rwxr-xr-x 1 xlegion xlegion 1464 Aug  9 17:01 pin-tutor.png
-rwxr-xr-x 1 xlegion xlegion 1647 Aug  9 17:01 pin-tutor-selected.png
-rwxr-xr-x 1 xlegion xlegion 1437 Aug  9 17:01 pin-verified.png
-rwxr-xr-x 1 xlegion xlegion 1642 Aug  9 17:01 pin-verified-selected.png

```

---

## Assistant (Build · DeepSeek V4 Flash Free · 83.6s)

Now extend `markerIcons.ts`

**Tool: edit**

**Input:**
```json
{
  "filePath": "/media/xlegion/Win/PROJECTS/EdumentX/src/lib/map/markerIcons.ts",
  "newString": "/**\n * markerIcons — Shared image refs for the custom map pins.\n *\n * expo-maps Google markers accept a `SharedRef<'image'>` as their\n * `icon`; expo-image's `Image.loadAsync` produces exactly that. The\n * pins (generated by `scripts/generate-markers.mjs`) are loaded\n * once and cached module-wide:\n *\n *   - pin-tutor.png             amber badge + slate dot  → regular tutor\n *   - pin-verified.png          green badge + white dot  → verified tutor\n *   - pin-cluster.png           slate badge + amber dot  → zoom-in cluster\n *   - pin-tutor-selected.png    amber badge + wide white ring → selected\n *   - pin-verified-selected.png green badge + wide white ring → selected\n *\n * The tail tip sits at the image bottom-center, which matches expo-maps'\n * default marker anchor.\n */\nimport { Image, type ImageRef } from \"expo-image\";\n\nexport type MarkerIconSet = {\n  tutor: ImageRef | null;\n  verified: ImageRef | null;\n  cluster: ImageRef | null;\n  tutorSelected: ImageRef | null;\n  verifiedSelected: ImageRef | null;\n};\n\nconst PIN_ASSETS = {\n  tutor: require(\"../../../assets/markers/pin-tutor.png\"),\n  verified: require(\"../../../assets/markers/pin-verified.png\"),\n  cluster: require(\"../../../assets/markers/pin-cluster.png\"),\n  tutorSelected: require(\"../../../assets/markers/pin-tutor-selected.png\"),\n  verifiedSelected: require(\"../../../assets/markers/pin-verified-selected.png\"),\n} as const;\n\nlet cache: MarkerIconSet | null = null;\nlet inflight: Promise<MarkerIconSet> | null = null;\n\n/** Returns the pin refs. Subsequent calls return the cached set. */\nexport function loadMarkerIcons(): Promise<MarkerIconSet> {\n  if (cache) return Promise.resolve(cache);\n  if (!inflight) {\n    inflight = Promise.all([\n      Image.loadAsync(PIN_ASSETS.tutor),\n      Image.loadAsync(PIN_ASSETS.verified),\n      Image.loadAsync(PIN_ASSETS.cluster),\n      Image.loadAsync(PIN_ASSETS.tutorSelected),\n      Image.loadAsync(PIN_ASSETS.verifiedSelected),\n    ])\n      .then(([tutor, verified, cluster, tutorSelected, verifiedSelected]) => {\n        cache = { tutor, verified, cluster, tutorSelected, verifiedSelected };\n        return cache;\n      })\n      .finally(() => {\n        inflight = null;\n      });\n  }\n  return inflight;\n}",
  "oldString": "/**\n * markerIcons — Shared image refs for the custom map pins.\n *\n * expo-maps Google markers accept a `SharedRef<'image'>` as their\n * `icon`; expo-image's `Image.loadAsync` produces exactly that. The\n * three pins (generated by `scripts/generate-markers.mjs`) are loaded\n * once and cached module-wide:\n *\n *   - pin-tutor.png    amber badge + slate dot  → regular tutor\n *   - pin-verified.png green badge + white dot  → verified tutor\n *   - pin-cluster.png  slate badge + amber dot  → zoom-in cluster\n *\n * The tail tip sits at the image bottom-center, which matches expo-maps'\n * default marker anchor.\n */\nimport { Image, type ImageRef } from \"expo-image\";\n\nexport type MarkerIconSet = {\n  tutor: ImageRef | null;\n  verified: ImageRef | null;\n  cluster: ImageRef | null;\n};\n\nconst PIN_ASSETS = {\n  tutor: require(\"../../../assets/markers/pin-tutor.png\"),\n  verified: require(\"../../../assets/markers/pin-verified.png\"),\n  cluster: require(\"../../../assets/markers/pin-cluster.png\"),\n} as const;\n\nlet cache: MarkerIconSet | null = null;\nlet inflight: Promise<MarkerIconSet> | null = null;\n\n/** Returns the three pin refs. Subsequent calls return the cached set. */\nexport function loadMarkerIcons(): Promise<MarkerIconSet> {\n  if (cache) return Promise.resolve(cache);\n  if (!inflight) {\n    inflight = Promise.all([\n      Image.loadAsync(PIN_ASSETS.tutor),\n      Image.loadAsync(PIN_ASSETS.verified),\n      Image.loadAsync(PIN_ASSETS.cluster),\n    ])\n      .then(([tutor, verified, cluster]) => {\n        cache = { tutor, verified, cluster };\n        return cache;\n      })\n      .finally(() => {\n        inflight = null;\n      });\n  }\n  return inflight;\n}"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · DeepSeek V4 Flash Free · 27.1s)

_Thinking:_

Now update MapSearch.tsx:
1. Add `selectedTutorId` state.
2. When a tutor marker is clicked → set selectedTutorId + the preview.
3. Marker icon selection: if `c.id === selectedTutorId`, use selected icon.
4. Add circles prop: when selectedTutor is set, `circles` = [{ id, lat, lng, radius: 2500, color: accentSoft with low alpha, lineColor: accent }]. AccentSoft = #FBEBCF — translucent version. The `color` fill for GoogleMapsCircle — let me check the circle record type (color: string hex). For translucency I need an 8-digit hex? Google Maps Circle fill color as int... expo-maps GoogleMapsCircle type: `color?: string` — I'll use `#FBEBCF` at ~35%: the API takes a hex string probably. Let me check the Circle type def quickly.
5. Filters: lift filter state; apply to tutors.
6. Nearby strip → CompactCard carousel.
7. Search/filter pill alignment + map seam sheet.

Let me check the GoogleMapsCircle type first.

**Tool: bash**

**Input:**
```json
{
  "command": "grep -n -B3 -A20 \"GoogleMapsCircle = {\" node_modules/expo-maps/build/google/GoogleMaps.types.d.ts | head -40"
}
```

**Output:**
```
86-/**
87- * @platform android
88- */
89:export type GoogleMapsCircle = {
90-    /**
91-     * The unique identifier for the circle. This can be used to identify the clicked circle in the `onCircleClick` event.
92-     */
93-    id?: string;
94-    /**
95-     * The coordinates of the circle.
96-     */
97-    center: Coordinates;
98-    /**
99-     * The radius of the circle.
100-     */
101-    radius: number;
102-    /**
103-     * The color of the circle.
104-     */
105-    color?: ProcessedColorValue | string;
106-    /**
107-     * The color of the circle line.
108-     */
109-    lineColor?: ProcessedColorValue | string;

```

---

## Assistant (Build · DeepSeek V4 Flash Free · 29.1s)

_Thinking:_

Circles accept hex strings. Android only (TutorMap circles only passed to GoogleMaps.View). For iOS, the AppleMaps View has `circles` prop too? Let me check AppleMapsViewProps for circles... earlier I saw AppleMaps has polylines/polygons; let me check for circles in the AppleMaps.types. If Apple supports circles, wire both. Quick grep.

**Tool: bash**

**Input:**
```json
{
  "command": "grep -n \"circles\" node_modules/expo-maps/build/apple/AppleMaps.types.d.ts | head; echo ===; grep -n -A6 \"AppleMapsCircle = {\" node_modules/expo-maps/build/apple/AppleMaps.types.d.ts | head -12"
}
```

**Output:**
```
376:     * The array of circles to display on the map.
378:    circles?: AppleMapsCircle[];
===
298:export type AppleMapsCircle = {
299-    /**
300-     * The unique identifier for the circle. This can be used to identify the clicked circle in the `onCircleClick` event.
301-     */
302-    id?: string;
303-    /**
304-     * The coordinates of the circle.

```

---

## Assistant (Build · DeepSeek V4 Flash Free · 151.1s)

_Thinking:_

Apple Maps also supports circles. I'll extend the IosMap to accept the `circles` prop too, and MapSearch passes the selected-tutor circle to both platforms via the shared `circles` prop (already in TutorMapProps).

Now rewrite MapSearch.tsx with all Phase 2 changes. This is the biggest edit. Let me plan the changes:

1. Imports: add `ScreenSheet`, `CompactCard` (TutorCard variant compact-h), `MapFilters` type + default + applyFilters helper, `DEFAULT_SERVICE_RADIUS_KM`.
2. State: `selectedTutorId: string | null`, `filters: MapFilters`.
3. Filtered tutors: `const filteredGeo = useMemo(() => applyFilters(geoHandlers), [tutors, filters])` — apply after geo (withPinCoordinates fills coords for all). Actually apply to raw tutors list then withPinCoordinates? Filtering by subjects/verified/budget/distance — distance needs coords? No — distance uses rankTutorsByDistance on geo. Let me: `filteredTutors` (subject/verified/budget) then `filteredGeo = withPinCoordinates(filteredTutors)` then distance-rank for nearby within maxDistance, and clusters over filteredGeo. Clean.
4. Markers map: use selected icon when `c.id === selectedTutorId` for the PNG fallback path. For avatar pins — no selected variant; keep base pin. The Circle under the selected tutor provides selection signal.
5. Circles prop: `const circles = selectedTutor ? [{ id: "selected-radius", latitude, longitude, radius: 2500, color: "#FBEBCF" (accent light) with alpha? , lineColor: "#E5A03B", lineWidth: 2 }] : []`. For translucency, `color: "#FBEBCF88"`? ProcessedColorValue | string — Android Color.parseColor supports 8-digit ARGB hex ("#88FBEBCF" — ARGB order!). Google's Color.parseColor("#RRGGBBAA")? Actually Android Color.parseColor supports #RRGGBB and #AARRGGBB (alpha first). Hmm — but Expo's ProcessedColorValue on Android converts via native color parser — Expo uses the standard Android parsing which reads #AARRGGBB. So an 8-digit hex "#44FBEBCF" would be alpha-first. To be safe and consistent, I'll use a named rgba string? Android Color.parseColor doesn't accept "rgba()". Options: use `#AARRGGBB`. I'll use alpha 0x4D (~30%): `#4DFBEBCF`. Define constants.
6. FiltersSheet → controlled: `value?: MapFilters; onChange(next: MapFilters); visible; onClose;` — MapSearch owns the state. FiltersSheet initializes local editing state from `value` when opened (useEffect on visible), and calls `onChange` on "Show results" + Reset + immediately for toggles? Simplest robust: FiltersSheet gets `value` + `onChange`; internal state synced via useEffect when `visible` flips true; every local setter calls `onChange` immediately? That makes "Show N results" already-applied... The mission: "the filters sheet... currently a dead-end: pick filters, hit Show results, nothing changes. Wire radius/verified/subjects/budget to the actual cluster + list query." Immediate apply is the cleanest UX: MapSearch filters reactively; the sheet's "Show results" just closes. Alternatively apply on close. I'll do: FiltersSheet is CONTROLLED by MapSearch (value + onChange), but keeps transient local state while editing, and calls `onApply` (the parent's onChange) when "Show results" pressed AND when Reset pressed. Actually to avoid jumpiness let me do a hybrid: the sheet owns an editable copy; synced from `value` each time it opens; "Show results" / Reset commit via onApply. Simple + predictable.
   - I need to add a mapping between the sheet's `verifiedOnly`, `distance`, `budget` and the listing fields. Budget: `monthlyRateNpr <= budget`? The budget is "up to Rs X/mo" → filter monthlyRateNpr <= budget. Distance: rank then keep <= distance km. Subjects: intersection (any match). Verified only: isVerifiedProfessional.
   - The subject list in the sheet is fixed (SUBJECTS array); tutor listings may have other subjects — filter if intersect of selected.
6. Nearby strip: horizontal ScrollView of CompactCard; build TutorListing → TutorProfile via createDefaultTutorProfile (already imported? MapSearch imports from `@/lib/tutor/firestoreTutorService` — createDefaultTutorProfile is in `@/lib/tutor/types` (StudentHome imports it). I'll import it. Note TutorCard expects `TutorProfile` (id, not uid). createDefaultTutorProfile({id: t.uid, ...}).
   - Remove NearbyTutorRow function.
7. Map area wrap in ScreenSheet + search pill + filter button round.

Also the nearby strip is `absolute bottom-2` overlaying the map — with CompactCard (200px wide) in a horizontal ScrollView it'll scroll. Good.

Also `bottom-36` recenter button — the nearby strip height changes… keep as is (bottom-36) — actually with the strip being shorter (one row of cards ~ 150px), bottom-36 (144px) still fine.

Let me now write the MapSearch rewrite. I'll do it in a series of edits. First the header/imports + constants:

Key imports to add:
- `ScreenSheet` from ScreenLayout
- `TutorCard` for CompactCard
- `createDefaultTutorProfile` from "@/lib/tutor/types"
- `defaultMapFilters, type MapFilters` — I'll define these in FiltersSheet.tsx and export them.

Let me define the MapFilters type + defaults in FiltersSheet.tsx:

```ts
export type MapFilters = {
  subjects: string[];
  level: string;
  mode: string;
  distance: number;      // km
  budget: number;        // NPR /mo
  verifiedOnly: boolean;
};

export const DEFAULT_FILTERS: MapFilters = {
  subjects: [], level: "", mode: "", distance: 20, budget: 30000, verifiedOnly: false,
};
```

Wait — existing defaults in the sheet were subjects:["Math"], level "SEE", mode "Home tuition", distance 5, budget 15000, verifiedOnly true. If those become the initial filter, the map would show very few tutors! The defaults should be non-restrictive: subjects [], distance 20 (max slider), budget 30000 (max), verifiedOnly false. That way the map shows everything until the student filters. Yes.

But the sheet UI needs sensible presets — start distance 5? The mission: "Wire radius/verified/subjects/budget to the actual cluster + list query. Set sane defaults". I'll default: subjects [], distance 15, budget 20000, verifiedOnly false. Distance slider max 20 → default 15. Budget max 30000 → default 20000?

Let me implement applyFilters in MapSearch:

```ts
function applyMapFilters(list: TutorListing[], f: MapFilters): TutorListing[] {
  return list.filter((t) => {
    if (f.verifiedOnly && !t.isVerifiedProfessional) return false;
    if (f.subjects.length > 0 && !f.subjects.some((s) => t.subjects.includes(s))) return false;
    if (f.budget > 0 && t.monthlyRateNpr > f.budget) return false;
    return true;
  });
}
```

Distance is applied via rankTutorsByDistance(filtered, userLat, userLng, f.distance) — need userLocation (exists). If no userLocation (fallback Kathmandu), still fine.

Then geo = withPinCoordinates(filteredTutors) — wait, current code: `const geo = useMemo(() => withPinCoordinates(tutors), [tutors])`. New: `filtered = useMemo(() => applyMapFilters(tutors, filters), [tutors, filters])`; `geo = useMemo(() => withPinCoordinates(filtered), [filtered])`. nearby = rankTutorsByDistance(geo, ..., f.distance).slice(0,5).

Nearby strip cards: CompactCard from TutorCard with createDefaultTutorProfile.

Now, does FiltersSheet take `subjects` from tutor data? TUTOR subject lists come from Firestore; sheet SUBJECTS static list may not match — filter by intersection still works.

Let me now make the edits to FilterSheet: controlled API:

```tsx
export function FiltersSheet({
  visible, onClose, value, onApply,
}: {
  visible: boolean;
  onClose: () => void;
  value: MapFilters;
  onApply: (f: MapFilters) => void;
}) {
  const [état, setTypo] = useState<MapFilters>(value);
  useEffect(() => { if (visible) setTypes(value); }, [visible]);
  ...
  const commit = (f: MapFilters) => { onApply(f); onClose(); };
  "Show N results" onPress={() => commit(local)}
  Reset: setLocal(DEFAULT); commit(DEFAULT)?
```

Hmm — "Reset" should reset AND apply? Keep: Reset sets local to DEFAULT and applies (so the map resets immediately). And slider "estimateResults" can use local state.

I'll keep `estimateResults` for the footer count but it's cosmetic. Fine.

Then MapSearch:

```tsx
const [filters, setFilters] = useState<MapFilters>(DEFAULT_MAP_FILTERS);
...
<FiltersSheet visible={filtersOpen} onClose={...} value={filters} onApply={setFilters} />
```

Now let me also handle `selectedTutor`: markers mapping uses `selectedTutorId`; on marker tap → also setSelectedTutorId(marker.id) (in addition to preview). When preview closes → clear selectedTutorId. Also when the map camera moves? Keep selection until preview closes. Also add `circles` to TutorMapView.

Radius constant: `const SERVICE_RADIUS_M = 2500;` (2.5 km default).

Circle fill: `#4DFBEBCF` (accentSoft ~30% alpha) — alpha-first ARGB. lineColor `#E5A03B`.

OK — writing the edits now. The markers mapping block and nearbyTutors block and filters state all change; the render gets edits. Let me do them piece by piece.

Apple Maps supports circles too — I'll wire the shared `circles` prop on both. Now the big MapSearch refactor. First the FiltersSheet API (make it controlled + actually

**Tool: edit**

**Input:**
```json
{
  "filePath": "/media/xlegion/Win/PROJECTS/EdumentX/src/screens/student/FiltersSheet.tsx",
  "newString": "/**\n * EdumentX — FiltersSheet (bottom-sheet overlay)\n *\n * Stage 2 (June 27, 2026):\n *   - This component is **not** a standalone screen. It's rendered\n *     inline by MapSearch as a Modal, with MapSearch visible at\n *     ~0.75 opacity underneath.\n *   - Slides up from the bottom with a spring-like easing. Drag-down\n *     to dismiss is wired via a PanResponder on the handle bar.\n *\n * Phase 7 (Aug 2026):\n *   - The sheet used to be UI-only (\"Show N results\" just closed).\n *     It is now a controlled component: MapSearch owns the `MapFilters`\n *     state and passes an initial `value`; the sheet edits a local\n *     copy and commits it via `onApply` on \"Show results\" (and Reset).\n *     MapSearch applies the filters to the actual cluster/list query.\n *\n * Public API:\n *   <FiltersSheet\n *     visible={...}\n *     value={filters}\n *     onApply={(next) => setFilters(next)}\n *     onClose={...}\n *   />\n */\n\nexport type MapFilters = {\n  /** Selected subjects — empty array = no subject constraint. */\n  subjects: string[];\n  /** Education level (\"\" = any). */\n  level: string;\n  /** Class mode (\"\" = any). */\n  mode: string;\n  /** Max distance in km — 20 = whole Valley, effectively \"any\". */\n  distance: number;\n  /** Max monthly budget in NPR — 30000 = effectively \"any\". */\n  budget: number;\n  /** Verified tutors only. */\n  verifiedOnly: boolean;\n};\n\n/** Non-restrictive defaults — the map shows everything until the\n *  student narrows it down. */\nexport const DEFAULT_MAP_FILTERS: MapFilters = {\n  subjects: [],\n  level: \"\",\n  mode: \"\",\n  distance: 20,\n  budget: 30000,\n  verifiedOnly: false,\n};\n\n/** Subject pills offered in the sheet. */\nexport const FILTER_SUBJECTS = [\n  \"Math\",\n  \"Physics\",\n  \"Chemistry\",\n  \"Biology\",\n  \"English\",\n  \"Nepali\",\n  \"Computer\",\n  \"Accounts\",\n];\n\nconst LEVELS = [\"Class 6-8\", \"SEE\", \"+2 Science\", \"+2 Mgmt\", \"Bachelor's\"];\nconst MODES = [\"Home tuition\", \"Online\", \"At tutor's place\"];",
  "oldString": "/**\n * EdumentX — FiltersSheet (bottom-sheet overlay)\n *\n * Stage 2 (June 27, 2026):\n *   - This component is **not** a standalone screen. It's rendered\n *     inline by MapSearch as a Modal, with MapSearch visible at\n *     ~0.75 opacity underneath.\n *   - Slides up from the bottom with a spring-like easing. Drag-down\n *     to dismiss is wired via a PanResponder on the handle bar.\n *   - Filter options mirror what real tutor-search filters need\n *     (subject, level, mode, distance, budget, verification) but\n *     are UI-only — no backend query yet. \"Show N results\" just\n *     closes the sheet.\n *   - Visual language matches StudentHome / MapSearch: amber accent,\n *     verification green, surface cards, NativeWind tokens (no raw\n *     hex).\n *\n * Public API:\n *   <FiltersSheet visible={...} onClose={...} />\n *\n * The component owns all of its own state (subjects, level, mode,\n * distance, budget, verifiedOnly). When the user hits \"Show results\"\n * the sheet just calls `onClose()` — MapSearch is responsible for\n * actually applying the filter when the real `tutors` query lands in\n * Phase 5.\n */\n\nconst SUBJECTS = [\n  \"Math\",\n  \"Physics\",\n  \"Chemistry\",\n  \"Biology\",\n  \"English\",\n  \"Nepali\",\n  \"Computer\",\n  \"Accounts\",\n];\nconst LEVELS = [\"Class 6-8\", \"SEE\", \"+2 Science\", \"+2 Mgmt\", \"Bachelor's\"];\nconst MODES = [\"Home tuition\", \"Online\", \"At tutor's place\"];"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · DeepSeek V4 Flash Free · 11.8s)

Now update the `FiltersSheet` function's state, props and commit behavior

**Tool: edit**

**Input:**
```json
{
  "filePath": "/media/xlegion/Win/PROJECTS/EdumentX/src/screens/student/FiltersSheet.tsx",
  "newString": "export function FiltersSheet({\n  visible,\n  value,\n  onApply,\n  onClose,\n}: {\n  visible: boolean;\n  /** Current filter state owned by MapSearch (the source of truth). */\n  value: MapFilters;\n  /** Commit the edited filters — fired by \"Show results\" and Reset. */\n  onApply: (filters: MapFilters) => void;\n  onClose: () => void;\n}) {\n  // Local editable copy — synced from the parent's `value` each time\n  // the sheet opens, so sliders never fight the live map state.\n  const [local, setLocal] = useState<MapFilters>(value);\n  useEffect(() => {\n    if (visible) setLocal(value);\n  }, [visible, value]);\n\n  const set = <K extends keyof MapFilters>(key: K, v: MapFilters[K]) =>\n    setLocal((f) => ({ ...f, [key]: v }));\n  const commit = (filters: MapFilters) => {\n    onApply(filters);\n    onClose();\n  };",
  "oldString": "export function FiltersSheet({\n  visible,\n  onClose,\n}: {\n  visible: boolean;\n  onClose: () => void;\n}) {\n  const [subjects, setSubjects] = useState<string[]>([\"Math\"]);\n  const [level, setLevel] = useState(\"SEE\");\n  const [mode, setMode] = useState(\"Home tuition\");\n  const [distance, setDistance] = useState(5);\n  const [budget, setBudget] = useState(15000);\n  const [verifiedOnly, setVerifiedOnly] = useState(true);"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · DeepSeek V4 Flash Free · 9.0s)

**Tool: edit**

**Input:**
```json
{
  "filePath": "/media/xlegion/Win/PROJECTS/EdumentX/src/screens/student/FiltersSheet.tsx",
  "newString": "const toggleSubject = (s: string) =>\n    set(\"subjects\", local.subjects.includes(s)\n      ? local.subjects.filter((x) => x !== s)\n      : [...local.subjects, s]);\n\n  const reset = () => {\n    const cleared: MapFilters = { ...value, subjects: [], level: \"\", mode: \"\", distance: 5, budget: 15000, verifiedOnly: false };\n    setLocal(cleared);\n    commit(cleared);\n  };\n\n  const resultCount = estimateResults(local.distance, local.budget, local.verifiedOnly);",
  "oldString": "const toggleSubject = (s: string) =>\n    setSubjects((arr) =>\n      arr.includes(s) ? arr.filter((x) => x !== s) : [...arr, s],\n    );\n\n  const reset = () => {\n    setSubjects([]);\n    setLevel(\"\");\n    setMode(\"\");\n    setDistance(5);\n    setBudget(15000);\n    setVerifiedOnly(false);\n  };\n\n  const resultCount = estimateResults(distance, budget, verifiedOnly);"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · DeepSeek V4 Flash Free · 9.9s)

_Thinking:_

Now update the JSX inside the sheet that references the old state names: subjects/level/mode/distance/budget/verifiedOnly → local.*. The Subsection renderers: SUBJECTS.map → FILTER_SUBJECTS. Let me update each reference.

**Tool: bash**

**Input:**
```json
{
  "command": "grep -n \"subjects\\|setLevel\\|setMode\\|setDistance\\|setBudget\\|setVerifiedOnly\\|SUBJECTS.map\\|{level}\\|{mode}\\|{distance}\\|{budget}\\|verifiedOnly\" src/screens/student/FiltersSheet.tsx | head -40"
}
```

**Output:**
```
52:  /** Selected subjects — empty array = no subject constraint. */
53:  subjects: string[];
63:  verifiedOnly: boolean;
69:  subjects: [],
74:  verifiedOnly: false,
93:function estimateResults(distance: number, budget: number, verifiedOnly: boolean): number {
97:  const verifiedPenalty = verifiedOnly ? 6 : 0;
199:  // Two visual languages: subjects get a teal outline when inactive
313:    set("subjects", local.subjects.includes(s)
314:      ? local.subjects.filter((x) => x !== s)
315:      : [...local.subjects, s]);
318:    const cleared: MapFilters = { ...value, subjects: [], level: "", mode: "", distance: 5, budget: 15000, verifiedOnly: false };
323:  const resultCount = estimateResults(local.distance, local.budget, local.verifiedOnly);
406:                {SUBJECTS.map((s) => (
410:                    active={subjects.includes(s)}
425:                    onPress={() => setLevel(l)}
438:                    onPress={() => setMode(m)}
444:            <Section title={`Distance · within ${distance} km`}>
448:                value={distance}
449:                onChange={setDistance}
460:                value={budget}
461:                onChange={setBudget}
469:                accessibilityState={{ checked: verifiedOnly }}
470:                onPress={() => setVerifiedOnly((v) => !v)}
481:                <FiltersVerifiedSwitch checked={verifiedOnly} />

```

---

## Assistant (Build · DeepSeek V4 Flash Free · 7.2s)

**Tool: read**

**Input:**
```json
{
  "filePath": "/media/xlegion/Win/PROJECTS/EdumentX/src/screens/student/FiltersSheet.tsx",
  "limit": 30,
  "offset": 400
}
```

**Output:**
```
<path>/media/xlegion/Win/PROJECTS/EdumentX/src/screens/student/FiltersSheet.tsx</path>
<type>file</type>
<content>
400:             className="px-5 pt-1 pb-4"
401:             style={{ maxHeight: 480 }}
402:             showsVerticalScrollIndicator={false}
403:           >
404:             <Section title="Subject">
405:               <View className="flex-row flex-wrap gap-2">
406:                 {SUBJECTS.map((s) => (
407:                   <Pill
408:                     key={s}
409:                     label={s}
410:                     active={subjects.includes(s)}
411:                     onPress={() => toggleSubject(s)}
412:                     variant="subject"
413:                   />
414:                 ))}
415:               </View>
416:             </Section>
417: 
418:             <Section title="Level">
419:               <View className="flex-row flex-wrap gap-2">
420:                 {LEVELS.map((l) => (
421:                   <Pill
422:                     key={l}
423:                     label={l}
424:                     active={level === l}
425:                     onPress={() => setLevel(l)}
426:                   />
427:                 ))}
428:               </View>
429:             </Section>

(Showing lines 400-429 of 566. Use offset=430 to continue.)
</content>
```

---

## Assistant (Build · DeepSeek V4 Flash Free · 31.0s)

**Tool: edit**

**Input:**
```json
{
  "filePath": "/media/xlegion/Win/PROJECTS/EdumentX/src/screens/student/FiltersSheet.tsx",
  "newString": "<Section title=\"Subject\">\n              <View className=\"flex-row flex-wrap gap-2\">\n                {FILTER_SUBJECTS.map((s) => (\n                  <Pill\n                    key={s}\n                    label={s}\n                    active={local.subjects.includes(s)}\n                    onPress={() => toggleSubject(s)}\n                    variant=\"subject\"\n                  />\n                ))}\n              </View>\n            </Section>\n\n            <Section title=\"Level\">\n              <View className=\"flex-row flex-wrap gap-2\">\n                {LEVELS.map((l) => (\n                  <Pill\n                    key={l}\n                    label={l}\n                    active={local.level === l}\n                    onPress={() => set(\"level\", local.level === l ? \"\" : l)}\n                  />\n                ))}\n              </View>\n            </Section>\n\n            <Section title=\"Class mode\">\n              <View className=\"flex-row flex-wrap gap-2\">\n                {MODES.map((m) => (\n                  <Pill\n                    key={m}\n                    label={m}\n                    active={local.mode === m}\n                    onPress={() => set(\"mode\", local.mode === m ? \"\" : m)}\n                  />\n                ))}\n              </View>\n            </Section>\n\n            <Section title={`Distance · within ${local.distance} km`}>\n              <RangeSlider\n                min={1}\n                max={20}\n                value={local.distance}\n                onChange={(v) => set(\"distance\", v)}\n              />\n            </Section>\n\n            <Section\n              title={`Budget · up to Rs ${local.budget.toLocaleString()}/mo`}\n            >\n              <RangeSlider\n                min={3000}\n                max={30000}\n                step={500}\n                value={local.budget}\n                onChange={(v) => set(\"budget\", v)}\n              />\n            </Section>\n\n            <Section title=\"Verification\">\n              <Pressable\n                accessibilityRole=\"switch\"\n                accessibilityLabel=\"Verified tutors only\"\n                accessibilityState={{ checked: local.verifiedOnly }}\n                onPress={() => set(\"verifiedOnly\", !local.verifiedOnly)}",
  "oldString": "<Section title=\"Subject\">\n              <View className=\"flex-row flex-wrap gap-2\">\n                {SUBJECTS.map((s) => (\n                  <Pill\n                    key={s}\n                    label={s}\n                    active={subjects.includes(s)}\n                    onPress={() => toggleSubject(s)}\n                    variant=\"subject\"\n                  />\n                ))}\n              </View>\n            </Section>\n\n            <Section title=\"Level\">\n              <View className=\"flex-row flex-wrap gap-2\">\n                {LEVELS.map((l) => (\n                  <Pill\n                    key={l}\n                    label={l}\n                    active={level === l}\n                    onPress={() => setLevel(l)}\n                  />\n                ))}\n              </View>\n            </Section>\n\n            <Section title=\"Class mode\">\n              <View className=\"flex-row flex-wrap gap-2\">\n                {MODES.map((m) => (\n                  <Pill\n                    key={m}\n                    label={m}\n                    active={mode === m}\n                    onPress={() => setMode(m)}\n                  />\n                ))}\n              </View>\n            </Section>\n\n            <Section title={`Distance · within ${distance} km`}>\n              <RangeSlider\n                min={1}\n                max={20}\n                value={distance}\n                onChange={setDistance}\n              />\n            </Section>\n\n            <Section\n              title={`Budget · up to Rs ${budget.toLocaleString()}/mo`}\n            >\n              <RangeSlider\n                min={3000}\n                max={30000}\n                step={500}\n                value={budget}\n                onChange={setBudget}\n              />\n            </Section>\n\n            <Section title=\"Verification\">\n              <Pressable\n                accessibilityRole=\"switch\"\n                accessibilityLabel=\"Verified tutors only\"\n                accessibilityState={{ checked: verifiedOnly }}\n                onPress={() => setVerifiedOnly((v) => !v)}"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · DeepSeek V4 Flash Free · 14.0s)

**Tool: edit**

**Input:**
```json
{
  "filePath": "/media/xlegion/Win/PROJECTS/EdumentX/src/screens/student/FiltersSheet.tsx",
  "newString": "<FiltersVerifiedSwitch checked={local.verifiedOnly} />",
  "oldString": "<FiltersVerifiedSwitch checked={verifiedOnly} />"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · DeepSeek V4 Flash Free · 18.3s)

_Thinking:_

Now update the footer buttons — "Show N results" should call `commit(local)` and Reset already calls `commit(cleared)` (it also calls onClose via commit). Let me check the footer block.

**Tool: read**

**Input:**
```json
{
  "filePath": "/media/xlegion/Win/PROJECTS/EdumentX/src/screens/student/FiltersSheet.tsx",
  "limit": 30,
  "offset": 486
}
```

**Output:**
```
<path>/media/xlegion/Win/PROJECTS/EdumentX/src/screens/student/FiltersSheet.tsx</path>
<type>file</type>
<content>
486:           {/* Footer */}
487:           <View className="flex-row gap-3 px-5 pt-3 pb-6 border-t border-border">
488:             <View className="flex-1">
489:               <SecondaryButton
490:                 label="Reset"
491:                 onPress={reset}
492:                 size="sm"
493:               />
494:             </View>
495:             <View className="flex-[2]">
496:               <PrimaryButton
497:                 label={`Show ${resultCount} result${resultCount === 1 ? "" : "s"}`}
498:                 onPress={onClose}
499:                 variant="accent"
500:                 size="md"
501:                 className="w-full"
502:               />
503:             </View>
504:           </View>
505:         </Animated.View>
506:       </View>
507:     </Modal>
508:   );
509: }
510: 
511: // ─── Sub-components ──────────────────────────────────────────────────────────
512: 
513: /**
514:  * "Verified tutors only" switch in the filters sheet. Replaces the
515:  * previous class-swap (`bg-verification` vs `bg-border` + `marginLeft`

(Showing lines 486-515 of 566. Use offset=516 to continue.)
</content>
```

---

## Assistant (Build · DeepSeek V4 Flash Free · 27.5s)

**Tool: edit**

**Input:**
```json
{
  "filePath": "/media/xlegion/Win/PROJECTS/EdumentX/src/screens/student/FiltersSheet.tsx",
  "newString": "<View className=\"flex-[2]\">\n              <PrimaryButton\n                label={`Show ${resultCount} result${resultCount === 1 ? \"\" : \"s\"}`}\n                onPress={() => commit(local)}\n                variant=\"accent\"\n                size=\"md\"\n                className=\"w-full\"\n              />\n            </View>",
  "oldString": "<View className=\"flex-[2]\">\n              <PrimaryButton\n                label={`Show ${resultCount} result${resultCount === 1 ? \"\" : \"s\"}`}\n                onPress={onClose}\n                variant=\"accent\"\n                size=\"md\"\n                className=\"w-full\"\n              />\n            </View>"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · DeepSeek V4 Flash Free · 16.0s)

_Thinking:_

The "Show N results" count — now that filters actually apply, the count should ideally reflect the real filtered count. But the sheet doesn't know the tutor list. Keep `estimateResults` as the label; MapSearch applies the real filter. Actually — I could pass a `resultCount` prop from MapSearch (real count). That's a nice touch: `resultCount?: number`. Let me add it as an optional prop; MapSearch computes `filteredGeo.length` (after distance) — pass it. When provided, show the real number. Let me add that.

Actually, keep scope tight — but "Show N results" showing a fake number after real filtering is a small lie. Let me add the prop.

Let me wire the real result count through the sheet:

**Tool: edit**

**Input:**
```json
{
  "filePath": "/media/xlegion/Win/PROJECTS/EdumentX/src/screens/student/FiltersSheet.tsx",
  "newString": "export function FiltersSheet({\n  visible,\n  value,\n  onApply,\n  onClose,\n  resultCount: resultCountProp,\n}: {\n  visible: boolean;\n  /** Current filter state owned by MapSearch (the source of truth). */\n  value: MapFilters;\n  /** Commit the edited filters — fired by \"Show results\" and Reset. */\n  onApply: (filters: MapFilters) => void;\n  onClose: () => void;\n  /** Live match count from the actual (filtered) tutor query. When\n   *  provided it replaces the estimate in the footer label. */\n  resultCount?: number;\n}) {",
  "oldString": "export function FiltersSheet({\n  visible,\n  value,\n  onApply,\n  onClose,\n}: {\n  visible: boolean;\n  /** Current filter state owned by MapSearch (the source of truth). */\n  value: MapFilters;\n  /** Commit the edited filters — fired by \"Show results\" and Reset. */\n  onApply: (filters: MapFilters) => void;\n  onClose: () => void;\n}) {"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · DeepSeek V4 Flash Free · 10.5s)

**Tool: edit**

**Input:**
```json
{
  "filePath": "/media/xlegion/Win/PROJECTS/EdumentX/src/screens/student/FiltersSheet.tsx",
  "newString": "const resultCount = resultCountProp ?? estimateResults(local.distance, local.budget, local.verifiedOnly);",
  "oldString": "const resultCount = estimateResults(local.distance, local.budget, local.verifiedOnly);"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · DeepSeek V4 Flash Free · 18.3s)

_Thinking:_

Now the MapSearch rewrite. Let me make all the changes:

1. Imports: ScreenSheet, TutorCard, createDefaultTutorProfile, MapFilters/DEFAULT_MAP_FILTERS.
2. State: filters, selectedTutorId.
3. Filtered geo + nearby with distance filter from filters.
4. Selected icon mapping.
5. Circles for selected tutor.
6. Search/filter pill alignment + map seam.
7. Nearby strip → CompactCard horizontal carousel.

Let me do the edits.

FiltersSheet done. Now MapSearch — imports and filter/

**Tool: edit**

**Input:**
```json
{
  "filePath": "/media/xlegion/Win/PROJECTS/EdumentX/src/screens/student/MapSearch.tsx",
  "newString": "import {\n  AnimatedPressable,\n  usePressScale,\n  motion,\n} from \"@/components/motion\";\nimport { BottomNav } from \"@/components/shared/BottomNav\";\nimport {\n  TutorMapView,\n  type MapCameraPosition,\n  type TutorMarker,\n  type TutorMapHandle,\n} from \"@/components/map/TutorMap\";\nimport { TutorPreviewSheet } from \"@/components/map/TutorPreviewSheet\";\nimport {\n  FiltersSheet,\n  DEFAULT_MAP_FILTERS,\n  type MapFilters,\n} from \"@/screens/student/FiltersSheet\";\nimport { TutorCard } from \"@/components/domain/TutorCard\";\nimport {\n  subscribeTutors,\n  type TutorListing,\n} from \"@/lib/tutor/firestoreTutorService\";\nimport { createDefaultTutorProfile } from \"@/lib/tutor/types\";\nimport { useTutorClustering, type TutorClusterFeature } from \"@/hooks/useTutorClustering\";\nimport { useCameraBounds } from \"@/hooks/useCameraBounds\";\nimport { useUserLocation } from \"@/hooks/useUserLocation\";\nimport { rankTutorsByDistance } from \"@/lib/location/distance\";\nimport { clampCameraToNepal } from \"@/lib/location/nepalBounds\";\nimport { withPinCoordinates } from \"@/lib/location/nepalGeo\";\nimport { loadMarkerIcons, type MarkerIconSet } from \"@/lib/map/markerIcons\";\nimport { useAvatarPins, avatarPinKey } from \"@/lib/map/avatarPins\";\nimport { colors } from \"@/constants/colors\";",
  "oldString": "import {\n  AnimatedPressable,\n  usePressScale,\n  motion,\n} from \"@/components/motion\";\nimport { BottomNav } from \"@/components/shared/BottomNav\";\nimport {\n  TutorMapView,\n  type MapCameraPosition,\n  type TutorMarker,\n  type TutorMapHandle,\n} from \"@/components/map/TutorMap\";\nimport { TutorPreviewSheet } from \"@/components/map/TutorPreviewSheet\";\nimport { FiltersSheet } from \"@/screens/student/FiltersSheet\";\nimport {\n  subscribeTutors,\n  type TutorListing,\n} from \"@/lib/tutor/firestoreTutorService\";\nimport { useTutorClustering, type TutorClusterFeature } from \"@/hooks/useTutorClustering\";\nimport { useCameraBounds } from \"@/hooks/useCameraBounds\";\nimport { useUserLocation } from \"@/hooks/useUserLocation\";\nimport { rankTutorsByDistance } from \"@/lib/location/distance\";\nimport { clampCameraToNepal } from \"@/lib/location/nepalBounds\";\nimport { withPinCoordinates } from \"@/lib/location/nepalGeo\";\nimport { loadMarkerIcons, type MarkerIconSet } from \"@/lib/map/markerIcons\";\nimport { useAvatarPins, avatarPinKey } from \"@/lib/map/avatarPins\";\nimport { colors } from \"@/constants/colors\";"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · DeepSeek V4 Flash Free · 24.3s)

**Tool: edit**

**Input:**
```json
{
  "filePath": "/media/xlegion/Win/PROJECTS/EdumentX/src/screens/student/MapSearch.tsx",
  "newString": "// ─── Constants ───────────────────────────────────────────────────────────────\n\n/** Kathmandu Valley default camera — Ratna Park at street/neighbourhood\n *  zoom (Kathmandu · Lalitpur · Bhaktapur ring). Used as the initial\n *  camera before GPS resolves. Nepal-only bounds live in\n *  `lib/location/nepalBounds.ts` and are enforced by `TutorMap`. */\nconst DEFAULT_CAMERA: MapCameraPosition = {\n  latitude: 27.7103,\n  longitude: 85.3222,\n  zoom: 15,\n};\n\n/** Service radius drawn under the selected pin (metres). The tutor\n *  profile has no radius field yet — 2.5 km is the sensible default\n *  for metro Nepal. */\nconst SELECTED_RADIUS_M = 2500;\n\n/** Translucent accent fill for the selected-tutor radius circle\n *  (AARRGGBB — alpha-first, Google Maps Android convention). */\nconst RADIUS_FILL = \"#3DFBEBCF\";\nconst RADIUS_LINE = \"#E5A03B\";",
  "oldString": "// ─── Constants ───────────────────────────────────────────────────────────────\n\n/** Kathmandu Valley default camera — Ratna Park at street/neighbourhood\n *  zoom (Kathmandu · Lalitpur · Bhaktapur ring). Used as the initial\n *  camera before GPS resolves. Nepal-only bounds live in\n *  `lib/location/nepalBounds.ts` and are enforced by `TutorMap`. */\nconst DEFAULT_CAMERA: MapCameraPosition = {\n  latitude: 27.7103,\n  longitude: 85.3222,\n  zoom: 15,\n};"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · DeepSeek V4 Flash Free · 9.0s)

Now the filtering + selection state and derived

**Tool: edit**

**Input:**
```json
{
  "filePath": "/media/xlegion/Win/PROJECTS/EdumentX/src/screens/student/MapSearch.tsx",
  "newString": "// ── UI state ──\n  const [search, setSearch] = useState(\"\");\n  const [filtersOpen, setFiltersOpen] = useState(false);\n  const [filters, setFilters] = useState<MapFilters>(DEFAULT_MAP_FILTERS);\n  const [selectedTutor, setSelectedTutor] = useState<TutorListing | null>(null);\n  const [selectedTutorId, setSelectedTutorId] = useState<string | null>(null);\n  const [previewVisible, setPreviewVisible] = useState(false);\n  const [markerIcons, setMarkerIcons] = useState<MarkerIconSet | null>(null);",
  "oldString": "// ── UI state ──\n  const [search, setSearch] = useState(\"\");\n  const [filtersOpen, setFiltersOpen] = useState(false);\n  const [selectedTutor, setSelectedTutor] = useState<TutorListing | null>(null);\n  const [previewVisible, setPreviewVisible] = useState(false);\n  const [markerIcons, setMarkerIcons] = useState<MarkerIconSet | null>(null);"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · DeepSeek V4 Flash Free · 10.5s)

**Tool: edit**

**Input:**
```json
{
  "filePath": "/media/xlegion/Win/PROJECTS/EdumentX/src/screens/student/MapSearch.tsx",
  "newString": "// Swim between the Search text + the actual filter query. The three\n  // \"pill\" filters (subjects / verified / budget) prune the listing;\n  // distance is applied against the user's GPS with\n  // `rankTutorsByDistance` below.\n  const filteredTutors = useMemo(() => {\n    const q = search.trim().toLowerCase();\n    return tutors.filter((t) => {\n      if (filters.verifiedOnly && !t.isVerifiedProfessional) return false;\n      if (\n        filters.subjects.length > 0 &&\n        !filters.subjects.some((s) => t.subjects.includes(s))\n      ) {\n        return false;\n      }\n      if (filters.budget > 0 && t.monthlyRateNpr > filters.budget) return false;\n      if (\n        q.length > 0 &&\n        !`${t.fullName} ${t.headline} ${t.subjects.join(\" \")}`\n          .toLowerCase()\n          .includes(q.toLowerCase())\n      ) {\n        return false;\n      }\n      return true;\n    });\n  }, [tutors, search, filters]);\n\n  // Coordinates for clustering. Legacy tutors (pre-GPS signup) have no\n  // `coordinates` on their doc — `withPinCoordinates` fills them from a\n  // Nepal centroid table (explicit GPS pin → city centroid → Valley\n  // centre) so every approved tutor gets a real pin.\n  const geo = useMemo(() => withPinCoordinates(filteredTutors), [filteredTutors]);",
  "oldString": "// Coordinates for clustering. Legacy tutors (pre-GPS signup) have no\n  // `coordinates` on their doc — `withPinCoordinates` fills them from a\n  // Nepal centroid table (explicit GPS pin → city centroid → Valley\n  // centre) so every approved tutor gets a real pin.\n  const geo = useMemo(() => withPinCoordinates(tutors), [tutors]);"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · DeepSeek V4 Flash Free · 60.8s)

**Tool: edit**

**Input:**
```json
{
  "filePath": "/media/xlegion/Win/PROJECTS/EdumentX/src/screens/student/MapSearch.tsx",
  "newString": "const markers: TutorMarker[] = visibleClusters.map((c) => {\n    if (c.type === \"cluster\") {\n      return {\n        id: `cluster-${c.id}`,\n        latitude: c.latitude,\n        longitude: c.longitude,\n        title: `${c.count} tutors`,\n        color: colors.brand.primary,\n        icon: markerIcons?.cluster,\n      };\n    }\n    const isSelected = c.id === selectedTutorId;\n    const key = avatarPinKey(\n      c.tutor.photoUrl,\n      c.tutor.isVerifiedProfessional,\n    );\n    const imageRef = avatarPins[key];\n    // Icon ladder: avatar teardrop → static teardrop PNG (branded\n    // fallback while rasterizing or after a failed capture) → native\n    // tinted pin (last resort). The selected variant swaps in the\n    // wide-white-ring pin (selection halo); avatar drop pins keep\n    // their photo (the radius circle below signals selection).\n    const icon =\n      imageRef !== undefined\n        ? imageRef\n        : isSelected\n          ? c.tutor.isVerifiedProfessional\n            ? markerIcons?.verifiedSelected\n            : markerIcons?.tutorSelected\n          : c.tutor.isVerifiedProfessional\n            ? markerIcons?.verified\n            : markerIcons?.tutor;\n    return {\n      id: c.id as string,\n      latitude: c.latitude,\n      longitude: c.longitude,\n      title: c.tutor.fullName,\n      color: c.tutor.isVerifiedProfessional\n        ? colors.brand.verification\n        : colors.brand.primary,\n      ...(icon ? { icon } : {}),\n    };\n  });\n\n  // ── Selected tutor service-radius circle ──\n  // Drawn under the selected pin (both platforms — expo-maps exposes\n  // `circles` on Google AND Apple). Translucent accent fill + accent\n  // stroke; the radius is the 2.5 km default until tutor profiles\n  // carry a real field.\n  const selectionCircle = selectedTutor\n    ? {\n        id: \"selected-radius\",\n        latitude: selectedTutor.coordinates?.latitude ?? selectedTutorCoordsFallbackLat,\n        longitude: selectedTutor.coordinates?.longitude ?? selectedTutorCoordsFallbackLng,\n        radius: DEFAULT_RADIUS_M,\n        color: RADIUS_FILL,\n        lineColor: RADIUS_LINE,\n        lineWidth: 1.5,\n      }\n    : null;",
  "oldString": "const markers: TutorMarker[] = visibleClusters.map((c) => {\n    if (c.type === \"cluster\") {\n      return {\n        id: `cluster-${c.id}`,\n        latitude: c.latitude,\n        longitude: c.longitude,\n        title: `${c.count} tutors`,\n        color: colors.brand.primary,\n        icon: markerIcons?.cluster,\n      };\n    }\n    const key = avatarPinKey(\n      c.tutor.photoUrl,\n      c.tutor.isVerifiedProfessional,\n    );\n    const imageRef = avatarPins[key];\n    // Icon ladder: avatar teardrop → static teardrop PNG (branded\n    // fallback while rasterizing or after a failed capture) → native\n    // tinted pin (last resort).\n    const icon =\n      imageRef !== undefined\n        ? imageRef\n        : c.tutor.isVerifiedProfessional\n          ? markerIcons?.verified\n          : markerIcons?.tutor;\n    return {\n      id: c.id as string,\n      latitude: c.latitude,\n      longitude: c.longitude,\n      title: c.tutor.fullName,\n      color: c.tutor.isVerifiedProfessional\n        ? colors.brand.verification\n        : colors.brand.primary,\n      ...(icon ? { icon } : {}),\n    };\n  });"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · DeepSeek V4 Flash Free · 21.1s)

_Thinking:_

I referenced some undefined identifiers (`selectedTutorCoordsFallbackLat/Lng`, `DEFAULT_RADIUS_M`). Let me fix that — the selected tutor always comes from `clusters`/`nearbyTutors` which have coordinates (from withPinCoordinates), but `selectedTutor` itself is a `TutorListing` which may lack `coordinates`. Better: store the selected tutor's coordinates from the geo mapping. Let me fix: find the selected tutor's coords from `geo`. I'll write it cleanly:

```ts
const selectedGeo = selectedTutorId ? geo.find(g => g.uid === selectedTutorId) : null;
const selectionCircle = selectedGeo
  ? { id: "selected-radius", latitude: selectedGeo.coordinates.latitude, ... }
  : null;
```

Since geo is `withPinCoordinates(filteredTutors)`, every entry has coordinates (non-optional there? let me check the return type — withPinCoordinates returns entries with coordinates assigned; the TutorListing type has `coordinates?` optional but the filled map returns objects with coordinates present; TS may still see it optional. I'll handle with non-null assertion or default.

Let me rewrite that block properly. Also note nearbyTutors ranking uses geo — keep. And `DEFAULT_RADIUS_M` → rename to `DEFAULT_SERVICE_RADIUS_M` (constant I defined: DEFAULT_RADIUS_M? I defined `DEFAULT_RADIUS_M` in constants? I wrote `DEFAULT_RADIUS_M` — no, I wrote `DEFAULT_RADIUS_M` in the circle but the constant I defined is `DEFAULT_SERVICE_RADIUS_M`... let me re-check: I defined `const DEFAULT_SERVICE_RADIUS_M = 2500;` — wait no, I defined `DEFAULT_RADIUS_M`? Looking back: I defined:

```
/** Service radius under the selected tutor... */
const DEFAULT_RADIUS_M = 2500;
```

No — I wrote `const DEFAULT_SERVICE_RADIUS_M = 2500;`? Let me re-read my edit: I wrote:

```
const DEFAULT_RADIUS_M = 2500;
```

Hmm no. The edit I applied says:
"/** Service radius drawn under the selected tutor (metre). ... */" — let me re-read the actual text I put:

```
/** Service radius drawn under the selected tutor (metre)... */
const DEFAULT_RADIUS_M = 2500;
```

Actually I wrote:
```
/** Service radius drawn under the selected pin (metres). Tutor profiles
 *  have no radius field; 2.5 km is the sensible default for metro
 *  tuition. */
const DEFAULT_RADIUS_M = 2500;
```

Wait, the actual edit was:
"const DEFAULT_RADIUS_M = 2500;" — I need to verify. The applied edit text was:

```
/** Service radius drawn under the selected pin (metres). The tutor
 *  profile has no radius field yet — 2.5 km is the sensible default
 *  for metro tutoring. */
const DEFAULT_RADIUS_M = 2500;
```

Hmm, actually no. Let me re-read what I actually wrote in the edit... The applied edit was:

```
/** Service radius under the selected tutor (metres). ... */
const DEFAULT_RADIUS_M = 2500;
```

I'm not 100% sure of the exact name. Let me just read the file to check, then fix the circle block to use the right names.

Let me fix the circle block with proper references — check the exact

**Tool: bash**

**Input:**
```json
{
  "command": "grep -n \"DEFAULT_RADIUS_M\\|RADIUS_FILL\\|RADIUS_LINE\\|selectedTutorCoords\\|selectionCircle\\|selectedGeo\" src/screens/student/MapSearch.tsx"
}
```

**Output:**
```
83:const RADIUS_FILL = "#3DFBEBCF";
84:const RADIUS_LINE = "#E5A03B";
279:  const selectionCircle = selectedTutor
282:        latitude: selectedTutor.coordinates?.latitude ?? selectedTutorCoordsFallbackLat,
283:        longitude: selectedTutor.coordinates?.longitude ?? selectedTutorCoordsFallbackLng,
284:        radius: DEFAULT_RADIUS_M,
285:        color: RADIUS_FILL,
286:        lineColor: RADIUS_LINE,

```

---

## Assistant (Build · DeepSeek V4 Flash Free · 23.8s)

**Tool: read**

**Input:**
```json
{
  "filePath": "/media/xlegion/Win/PROJECTS/EdumentX/src/screens/student/MapSearch.tsx",
  "limit": 15,
  "offset": 78
}
```

**Output:**
```
<path>/media/xlegion/Win/PROJECTS/EdumentX/src/screens/student/MapSearch.tsx</path>
<type>file</type>
<content>
78:  *  for metro Nepal. */
79: const SELECTED_RADIUS_M = 2500;
80: 
81: /** Translucent accent fill for the selected-tutor radius circle
82:  *  (AARRGGBB — alpha-first, Google Maps Android convention). */
83: const RADIUS_FILL = "#3DFBEBCF";
84: const RADIUS_LINE = "#E5A03B";
85: 
86: // ─── Component ───────────────────────────────────────────────────────────────
87: 
88: export function MapSearch() {
89:   const router = useRouter();
90:   const mapRef = useRef<TutorMapHandle>(null);
91: 
92:   // ── Location ──

(Showing lines 78-92 of 608. Use offset=93 to continue.)
</content>
```

---

## Assistant (Build · DeepSeek V4 Flash Free · 24.9s)

**Tool: edit**

**Input:**
```json
{
  "filePath": "/media/xlegion/Win/PROJECTS/EdumentX/src/screens/student/MapSearch.tsx",
  "newString": "// ── Selected tutor service-radius circle ──\n  // Drawn under the selected pin (both platforms — expo-maps exposes\n  // `circles` on Google AND Apple). Translucent accent fill + accent\n  // stroke. The selected tutor is always one of the pinned clusters\n  // (`selectionGeo`), so its coordinates are resolved.\n  const selectionGeo = selectedTutorId\n    ? geo.find((g) => g.uid === selectedTutorId) ?? null\n    : null;\n  const selectionCircle = selectionGeo\n    ? {\n        id: \"selected-radius\",\n        latitude: selectionGeo.coordinates.latitude,\n        longitude: selectionGeo.coordinates.longitude,\n        radius: SELECTED_RADIUS_M,\n        color: RADIUS_FILL,\n        lineColor: RADIUS_LINE,\n        lineWidth: 1.5,\n      }\n    : null;",
  "oldString": "// ── Selected tutor service-radius circle ──\n  // Drawn under the selected pin (both platforms — expo-maps exposes\n  // `circles` on Google AND Apple). Translucent accent fill + accent\n  // stroke; the radius is the 2.5 km default until tutor profiles\n  // carry a real field.\n  const selectionCircle = selectedTutor\n    ? {\n        id: \"selected-radius\",\n        latitude: selectedTutor.coordinates?.latitude ?? selectedTutorCoordsFallbackLat,\n        longitude: selectedTutor.coordinates?.longitude ?? selectedTutorCoordsFallbackLng,\n        radius: DEFAULT_RADIUS_M,\n        color: RADIUS_FILL,\n        lineColor: RADIUS_LINE,\n        lineWidth: 1.5,\n      }\n    : null;"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · DeepSeek V4 Flash Free · 56.6s)

_Thinking:_

Wait — `geo` from `withPinCoordinates` — what's the return type? `PinResolvable` with `coordinates?`. Let me check the return type of withPinCoordinates to see if `coordinates` is guaranteed non-optional. If the type still marks it optional, TS will complain. Let me check.

**Tool: bash**

**Input:**
```json
{
  "command": "sed -n '100,135p' src/lib/location/nepalGeo.ts"
}
```

**Output:**
```
  const n = label.toLowerCase().trim();
  if (!n) return null;
  const exact = NEPAL_CITY_CENTROIDS[n];
  if (exact) return exact;
  const partial = Object.entries(NEPAL_CITY_CENTROIDS).find(
    ([key]) => n.includes(key) || key.includes(n),
  );
  return partial ? partial[1] : null;
}

export type PinResolvable = {
  location?: { neighborhood?: string; city?: string } | null;
  coordinates?: LatLon | null;
};

/**
 * Fill a listing's coordinates from the fallback chain (explicit →
 * centroid → Kathmandu Valley centre). Returns a NEW array — the
 * caller's snapshot is not mutated.
 */
export function withPinCoordinates<T extends PinResolvable>(
  tutors: readonly T[],
): T[] {
  return tutors.map((t) => {
    if (t.coordinates) return t;
    const centroid = centroidFor(t.location);
    return {
      ...t,
      coordinates: centroid ?? { ...KATHMANDU_VALLEY_CENTER },
    };
  });
}
```

---

## Assistant (Build · DeepSeek V4 Flash Free · 250.7s)

---

## User

continue from the interrupted task

---

## Assistant (Build · MiMo V2.5 Free · 3.6s)

---

## User

continue from the interrupted task

---

## Assistant (Build · MiMo V2.5 Free · 5.1s)

---

## User

continue from the interrupted task

---

## Assistant (Build · MiMo V2.5 Free · 5.4s)

---

## User

continue from the interrupted task

---

## Assistant (Build · DeepSeek V4 Flash Free · 7.8s)

---

## User

continue from the interrupted task

---

## Assistant (Build · DeepSeek V4 Flash Free · 2.9s)

---

## User

continue from the interrupted task

---

## Assistant (Build · DeepSeek V4 Flash Free · 5.0s)

---

## User

continue from the interrupted task

---

## Assistant (Build · DeepSeek V4 Flash Free · 7.1s)

---

