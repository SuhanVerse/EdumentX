import { useMemo } from 'react';
import Supercluster from 'supercluster';
import type { PropertyPin, ClusterFeature } from '@/src/types/map.types';

interface GeoJsonFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
  properties: PropertyPin & { cluster?: boolean };
}

export function useMapClustering(
  properties: PropertyPin[],
  zoom: number,
  bounds?: { swLat: number; swLng: number; neLat: number; neLng: number } | null,
): ClusterFeature[] {
  const index = useMemo(() => {
    const cluster = new Supercluster<PropertyPin, Record<string, never>>({
      radius: 60,
      maxZoom: 16,
      minZoom: 1,
    });

    const features: GeoJsonFeature[] = properties.map((p) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [p.longitude, p.latitude],
      },
      properties: p,
    }));

    cluster.load(features as any);
    return cluster;
  }, [properties]);

  const clusters = useMemo(() => {
    if (!bounds) return [];

    const bbox: [number, number, number, number] = [
      bounds.swLng,
      bounds.swLat,
      bounds.neLng,
      bounds.neLat,
    ];

    const visibleClusters = index.getClusters(bbox, Math.floor(zoom));

    return visibleClusters.map((feature: any) => {
      const [lng, lat] = feature.geometry.coordinates;
      const props = feature.properties;

      if (props.cluster) {
        const clusterId = props.cluster_id;
        const leaves = index.getLeaves(clusterId, Infinity);
        return {
          id: `cluster-${clusterId}`,
          type: 'cluster' as const,
          latitude: lat,
          longitude: lng,
          count: props.point_count,
          properties: leaves.map((l: any) => l.properties),
        };
      }

      return {
        id: props.id,
        type: 'property' as const,
        latitude: lat,
        longitude: lng,
        properties: [props],
      };
    });
  }, [index, bounds, zoom]);

  return clusters;
}
