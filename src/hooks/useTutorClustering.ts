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
      bounds.neLng,
      bounds.neLat,
    ];

    const clusters = supercluster.getClusters(bbox, Math.round(zoom));

    return clusters.map((cluster): TutorClusterFeature => {
      if (cluster.properties.cluster) {
        // Extract leaves to get the actual tutors in this cluster
        const leaves = supercluster.getLeaves(cluster.id as number, Infinity);
        const clusterTutors = leaves.map((leaf) => leaf.properties.tutor);
        
        return {
          type: 'cluster' as const,
          id: cluster.id as number,
          latitude: cluster.geometry.coordinates[1],
          longitude: cluster.geometry.coordinates[0],
          count: cluster.properties.point_count as number,
          tutors: clusterTutors as TutorListing[],
        };
      }

      // Single tutor point
      return {
        type: 'tutor' as const,
        id: cluster.properties.tutor.uid,
        latitude: cluster.geometry.coordinates[1],
        longitude: cluster.geometry.coordinates[0],
        tutor: cluster.properties.tutor,
      };
    });
  }, [tutors, supercluster, bounds, zoom]);

  return features;
}
